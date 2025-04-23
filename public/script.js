// Global variables
let map;
let currentMarkers = [];
let currentFeatureGroup;

function initMap() {
  map = L.map('map').setView([29.7604, -95.3698], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

async function init() {
  initMap();
  await loadCemeteries();
}

async function loadCemeteries() {
  try {
      const [cemeteryList, cemeteryInfo] = await Promise.all([
          fetch('/api/cemeteries').then(response => response.json()),
          fetch('/api/cemeteries/info').then(response => response.json())
      ]);

      const sidebar = document.querySelector('.sidebar');
      const searchBox = document.createElement('input');
      searchBox.type = 'text';
      searchBox.placeholder = 'Search cemeteries...';
      searchBox.className = 'search-box';
      searchBox.addEventListener('input', () => filterCemeteries(searchBox.value, cemeteryList));
      document.querySelector('.search-box').appendChild(searchBox);

      const cemeteryListElement = document.createElement('ul');
      cemeteryListElement.className = 'cemetery-list';

      cemeteryList.forEach(cemetery => {
          const li = document.createElement('li');
          li.textContent = cemetery;
          li.addEventListener('click', async () => {
              // Clear existing markers
              if (currentFeatureGroup) {
                  currentFeatureGroup.clearLayers();
              }

              // Update cemetery name display with animation
              updateCemeteryName(cemetery);
              
              // Load cemetery files
              await loadCemeteryFiles(cemetery);
              
              // Load cemetery notes
              await loadCemeteryNotes(cemetery);
              
              // Find cemetery info and update map
              const info = cemeteryInfo.find(c => c.Name === cemetery);
              if (info) {
                  document.getElementById('zone-container').textContent = `Zone: ${info.Zone}`;
                  document.getElementById('distance-container').textContent = `Distance: ${info.Distance} miles`;

                  if (info.Address) {
                      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(info.Address)}`;
                      const response = await fetch(geocodeUrl);
                      const geocodeData = await response.json();

                      if (geocodeData.length > 0) {
                          const { lat, lon } = geocodeData[0];
                          map.setView([lat, lon], 13);
                          L.marker([lat, lon])
                              .addTo(map)
                              .bindPopup(info.Address)
                              .openPopup();
                      }
                  }
              }

              // Highlight selected cemetery
              const listItems = document.querySelectorAll('.cemetery-list li');
              listItems.forEach(item => {
                  item.classList.toggle('selected', item.textContent === cemetery);
              });
          });
          cemeteryListElement.appendChild(li);
      });

      sidebar.appendChild(cemeteryListElement);

      // Auto-select Earthman Resthaven
      const earthmanResthaven = Array.from(cemeteryListElement.children)
          .find(li => li.textContent === 'Earthman Resthaven');
          if (earthmanResthaven) {
            earthmanResthaven.click(); // Use click() instead of updateCemeteryName()
        }
  } catch (error) {
      console.error('Error loading cemeteries:', error);
  }
}

function filterCemeteries(searchTerm, cemeteryList) {
  const listItems = document.querySelectorAll('.cemetery-list li');
  const searchTermLower = searchTerm.toLowerCase();

  listItems.forEach(item => {
      const cemeteryName = item.textContent.toLowerCase();
      item.style.display = cemeteryName.includes(searchTermLower) ? '' : 'none';
  });
}

async function loadCemeteryFiles(cemeteryName) {
  try {
      const response = await fetch(`/api/cemeteries/${cemeteryName}/files`);
      const files = await response.json();
      
      const documentsContainer = document.getElementById('documents-container');
      documentsContainer.innerHTML = '';

      files.forEach(file => {
          const fileLink = document.createElement('a');
          fileLink.href = `/cemeteries/${cemeteryName}/${file}`;
          fileLink.textContent = file;
          fileLink.target = '_blank';
          
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          fileItem.appendChild(fileLink);
          
          documentsContainer.appendChild(fileItem);
      });
  } catch (error) {
      console.error('Error loading cemetery files:', error);
      document.getElementById('documents-container').innerHTML = 'Error loading files';
  }
}

async function loadCemeteryNotes(cemeteryName) {
  try {
      const response = await fetch(`/api/cemeteries/${cemeteryName}/notes`);
      const data = await response.json();
      const notesContainer = document.getElementById('notes-container');
      notesContainer.innerHTML = data.notes || '<p>No notes available</p>';

      const calculatorScripts = notesContainer.querySelectorAll('script[data-calculator-type]');
      
      calculatorScripts.forEach(script => {
          const calculatorType = script.getAttribute('data-calculator-type');
          eval(script.textContent);

          if (window.calculatorFunctions[calculatorType]) {
              window.calculatorFunctions[calculatorType].setup();
          }
      });
  } catch (error) {
      console.error('Error loading cemetery notes:', error);
      document.getElementById('notes-container').innerHTML = '<p>Unable to load notes</p>';
  }
}

function updateCemeteryName(name) {
    const cemeteryName = document.getElementById('cemetery-name');
    cemeteryName.textContent = name;
    cemeteryName.classList.remove('animate');
    // Trigger reflow
    void cemeteryName.offsetWidth;
    cemeteryName.classList.add('animate');
}

document.addEventListener('DOMContentLoaded', init);