let map;
let baseLayers;
let currentBaseLayer;
let routingControl = null;
let userLocationMarker = null; // Markeer lokasi pengguna

const homeCoords = [-6.85, 107.5];
const homeZoom = 10;

function initMap() {
  baseLayers = {
    cartoDark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }),
    esriDark: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    }),
  };

  map = L.map('mapid', {
    center: homeCoords,
    zoom: homeZoom,
    zoomControl: false,
    layers: [baseLayers.cartoDark]
  });

  currentBaseLayer = baseLayers.cartoDark;

  // Layer Batas Administrasi
  const admLayer = new L.GeoJSON.AJAX("DATA/ADM_POLYG.geojson", {
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      layer.bindPopup(`
        <strong>${props.nama || 'Wilayah'}</strong><br>
        Elevasi: ${props.elevasi || '-'} mdpl<br>
        Skala Bortle: ${props.bortle || '-'}<br>
        Arah pandang: ${props.arah || '-'}
      `);
    },
    style: {
      color: "#FFFFFF",
      weight: 2,
      fillOpacity: 0.8
    }
  });

  admLayer.addTo(map);
  admLayer.on('data:loaded', () => {
    admLayer.bringToBack();
    console.log("✅ ADM.geojson loaded!");
  });

  // Layer Lokasi Langit Gelap
  const lokasiLangitLayer = new L.GeoJSON.AJAX("DATA/DARKSKY_BB_REVISIWWW.geojson", {
    pointToLayer: (feature, latlng) => {
      const starIcon = L.divIcon({
        html: '★',
        className: 'star-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      return L.marker(latlng, { icon: starIcon });
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const lat = feature.geometry.coordinates[1];
      const lng = feature.geometry.coordinates[0];

      layer.bindPopup(`
        <strong>${props.nama || 'Lokasi'}</strong><br>
        Elevasi: ${props.elevasi || '-'} mdpl<br>
        Skala Bortle: ${props.bortle || '-'}<br>
        Arah pandang: ${props.arah || '-'}<br>
        Waktu terbaik: ${props.waktu || '-'}<br>
        <button onclick="showRouteTo([${lat}, ${lng}])">➤Tunjukkan Rute</button>
      `);
    }
  });

  lokasiLangitLayer.addTo(map);
  lokasiLangitLayer.on('data:loaded', () => {
    console.log("🌌 DARKSKY_BB_REVISIWWW.geojson loaded!");
  });

  lokasiLangitLayer.on('popupclose', () => {
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
  });

  // Legenda
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += `
      <style>
        .legend { background: rgba(0,0,0,0.6); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
        .legend i { display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; }
        .legend .adm { background:rgb(255, 255, 255); border: 1px solid #fff; }
        .legend .star { color: gold; font-size: 16px; vertical-align: middle; }
      </style>
      <div class="legend">
        <div><i class="adm"></i> Batas Administrasi</div>
        <div><span class="star">★</span> Titik Lokasi</div>
      </div>
    `;
    return div;
  };

  legend.addTo(map);
}

// Tunjukkan rute dari lokasi pengguna ke tujuan
function showRouteTo(destinationLatLng) {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  map.locate({ setView: false, maxZoom: 14 });

  map.once('locationfound', function (e) {
    const userLatLng = e.latlng;

    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLatLng),
        L.latLng(destinationLatLng)
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      routeWhileDragging: false,
      show: true,
      lineOptions: {
        styles: [
          { color: 'white', weight: 10 },   // garis tepi
          { color: 'blue', weight: 6 }      // garis utama
        ]
      },
      createMarker: () => null
    }).addTo(map);
  });

  map.once('locationerror', () => {
    alert("Tidak dapat menemukan lokasi pengguna.");
  });
}

// Reset tampilan ke awal
function resetView() {
  map.setView(homeCoords, homeZoom);
}

// Lokasi pengguna dengan marker yang bisa dihapus
function locateUser() {
  map.locate({ setView: true, maxZoom: 16 });

  map.once('locationfound', (e) => {
    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }

  const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', // ganti warna sesuai selera
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
    userLocationMarker = L.marker(e.latlng, { icon: userIcon })
      .addTo(map)
      .bindPopup("Kamu ada di sini!")
      .openPopup();

    userLocationMarker.on('popupclose', () => {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    });
  });

  map.once('locationerror', () => {
    alert("Lokasi tidak ditemukan.");
  });
}

function zoomIn() { map.zoomIn(); }
function zoomOut() { map.zoomOut(); }

function changeBasemap(value) {
  if (currentBaseLayer) map.removeLayer(currentBaseLayer);

  if (baseLayers[value]) {
    currentBaseLayer = baseLayers[value];
    map.addLayer(currentBaseLayer);
  } else {
    console.warn("Basemap tidak dikenal:", value);
  }
}

document.addEventListener('DOMContentLoaded', initMap);

document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('.toggle-btn');
  buttons.forEach(button => {
    button.addEventListener('click', function () {
      const info = this.nextElementSibling;
      info.classList.toggle('show');
    });
  });
});
