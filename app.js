const auth = firebase.auth();
const storage = firebase.storage();

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');

loginBtn.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    loginError.textContent = 'Please enter email and password.';
    return;
  }

  loginError.textContent = '';
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      loginError.textContent = error.message;
    });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'block';
    renderTerminals();
  } else {
    loginContainer.style.display = 'block';
    appContainer.style.display = 'none';
  }
});

const terminalData = ["1st Terminal", "2nd Terminal", "3rd Terminal"];
const terminalsContainer = document.getElementById('terminals');

function renderTerminals() {
  terminalsContainer.innerHTML = '';
  terminalData.forEach((name, index) => {
    const html = `
      <div class="terminal" id="terminal${index}">
        <h2>${name}</h2>
        <div class="input-group"><label>BCA 1</label><input type="number" class="bca" data-terminal="${index}"></div>
        <div class="input-group"><label>BCA 2</label><input type="number" class="bca" data-terminal="${index}"></div>
        <div class="input-group"><label>BCA 3</label><input type="number" class="bca" data-terminal="${index}"></div>
        <div class="input-group"><label>RGC Bags</label><input type="number" class="rgc" data-terminal="${index}"></div>
        <div class="input-group"><label>People</label><input type="number" class="people" data-terminal="${index}"></div>
        <div class="input-group rgc-flight-controls">
          <label>RGC Flights</label>
          <button onclick="adjustRgcFlight(${index}, -1)">-</button>
          <input type="number" class="rgc-flight" data-terminal="${index}" value="0" readonly>
          <button onclick="adjustRgcFlight(${index}, 1)">+</button>
        </div>
        <div class="totals">Total BCA: <span id="totalBca-${index}">0</span> | Total Bags: <span id="totalBags-${index}">0</span></div>
      </div>`;
    terminalsContainer.insertAdjacentHTML('beforeend', html);
  });
  document.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateTotals));
}

function adjustRgcFlight(index, delta) {
  const input = document.querySelector(\`.rgc-flight[data-terminal="\${index}"]\`);
  let value = parseInt(input.value) || 0;
  input.value = Math.max(0, value + delta);
  calculateTotals();
}

function calculateTotals() {
  let totalFlights = 0, allTotalBags = 0, allPeople = 0;

  terminalData.forEach((_, i) => {
    const bcaInputs = document.querySelectorAll(\`.bca[data-terminal="\${i}"]\`);
    const rgcInput = document.querySelector(\`.rgc[data-terminal="\${i}"]\`);
    const peopleInput = document.querySelector(\`.people[data-terminal="\${i}"]\`);
    const rgcFlightInput = document.querySelector(\`.rgc-flight[data-terminal="\${i}"]\`);

    let totalBca = 0;
    bcaInputs.forEach(input => {
      const val = parseInt(input.value);
      if (!isNaN(val)) {
        totalBca += val;
        totalFlights++;
      }
    });

    const rgcVal = parseInt(rgcInput.value) || 0;
    const peopleVal = parseInt(peopleInput.value) || 0;
    const rgcFlights = parseInt(rgcFlightInput.value) || 0;

    totalFlights += rgcFlights;
    const totalBags = totalBca + rgcVal;
    allTotalBags += totalBags;
    allPeople += peopleVal;

    document.getElementById(\`totalBca-\${i}\`).textContent = totalBca;
    document.getElementById(\`totalBags-\${i}\`).textContent = totalBags;
  });

  document.getElementById('totalFlights').textContent = totalFlights;
  document.getElementById('allTotalBags').textContent = allTotalBags;
  document.getElementById('allPeople').textContent = allPeople;
}

function copySummary() {
  const flights = document.getElementById('totalFlights').textContent;
  const bags = document.getElementById('allTotalBags').textContent;
  const people = document.getElementById('allPeople').textContent;
  const summary = `${flights} flights, ${bags} baggage, ${people} people`;

  navigator.clipboard.writeText(summary).then(() => alert(\`Copied to clipboard:\n\${summary}\`)).catch(() => alert('Copy failed.'));
}

function generateCsvString() {
  let csv = '';

  terminalData.forEach((terminalName, i) => {
    const bcaInputs = Array.from(document.querySelectorAll(\`.bca[data-terminal="\${i}"]\`)).map(el => parseInt(el.value) || 0);
    const totalBca = bcaInputs.reduce((sum, val) => sum + val, 0);
    const bcaFlights = bcaInputs.filter(val => val > 0).length;
    const rgcBags = parseInt(document.querySelector(\`.rgc[data-terminal="\${i}"]\`).value) || 0;
    const rgcFlights = parseInt(document.querySelector(\`.rgc-flight[data-terminal="\${i}"]\`).value) || 0;
    const people = parseInt(document.querySelector(\`.people[data-terminal="\${i}"]\`).value) || 0;

    const totalFlights = bcaFlights + rgcFlights;

    csv += \`=== \${terminalName} ===\n\`;
    csv += \`Total Flights,BCA Total,RGC Bags,People\n\`;
    csv += \`\${totalFlights},\${totalBca},\${rgcBags},\${people}\n\n\`;
  });

  return csv.trim();
}

async function uploadCSV() {
  const csvContent = generateCsvString();
  const blob = new Blob([csvContent], { type: 'text/csv' });

  const now = new Date();
  const filename = `returns/report-\${now.toISOString().split('T')[0]}.csv`;
  const storageRef = firebase.storage().ref().child(filename);

  try {
    document.getElementById('uploadStatus').textContent = 'Uploading...';
    await storageRef.put(blob);
    document.getElementById('uploadStatus').textContent = '✅ Upload successful!';
  } catch (err) {
    console.error('Upload error:', err);
    document.getElementById('uploadStatus').textContent = '❌ Upload failed.';
  }
}
