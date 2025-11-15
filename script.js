// ===== Logout (LocalStorage) =====
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedUser');
    // Optional: also clear local favorites/recent if you want per-user isolation
    // localStorage.removeItem('favoriteCities');
    // localStorage.removeItem('recentCities');
    window.location.replace('login.html');
  });
}

// Rating storage
const RATING_DATA_KEY = "weatherAppRatingData";
const USER_RATING_KEY = "weatherAppUserRating";

document.addEventListener("DOMContentLoaded", () => {
  initRating();
});



/************************************
 CONFIG — API KEY
*************************************/
const OPENWEATHER_KEY = "54aa1e654d77ad604e546a138643d8de";

/************************************
 Helpers: fetch + time formatting
*************************************/
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // OpenWeather sometimes returns 200 with error payloads
  if (data.cod && data.cod !== 200 && data.cod !== "200") {
    const msg = data.message || "API error";
    throw new Error(msg);
  }
  return data;
}

// Format a time given a UTC timestamp (seconds) and a city timezone offset (seconds)
function fmtTime(utcSeconds, tzOffsetSeconds) {
  const d = new Date((utcSeconds + tzOffsetSeconds) * 1000);
  const hh = d.getUTCHours();
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const h12 = ((hh % 12) || 12);
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${h12}:${mm} ${ampm}`;
}

// Weekday short label using the city offset
function weekdayShort(utcSeconds, tzOffsetSeconds) {
  const d = new Date((utcSeconds + tzOffsetSeconds) * 1000);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

/************************************
 MAIN — Get Weather (kept global for HTML onclick)
*************************************/
window.fetchWeather = async function fetchWeather() {
  const cityInput = document.getElementById("city").value.trim();
  if (!cityInput) {
    alert("Please enter a city name!");
    return;
  }

  const base = "https://api.openweathermap.org/data/2.5";
  const q = `q=${encodeURIComponent(cityInput)}&appid=${OPENWEATHER_KEY}&units=metric`;

  try {
    // Current weather
    const current = await getJSON(`${base}/weather?${q}`);
    renderCurrentWeather(current, cityInput);

    // 3-hour forecast (5 days)
    const forecast = await getJSON(`${base}/forecast?${q}`);
    const tzOffset = forecast?.city?.timezone ?? 0;
    renderForecast(forecast.list, tzOffset);
  } catch (err) {
    showError(String(err.message || err));
  }
};

/************************************
 UI helpers
*************************************/
function showError(msg) {
  const infoEl = document.getElementById("weather-info");
  const tempEl = document.getElementById("temp-div");
  const tipsEl = document.getElementById("weather-tips");
  const iconEl = document.getElementById("weather-icon");

  if (tempEl) tempEl.innerHTML = "";
  if (iconEl) iconEl.style.display = "none";
  if (infoEl) infoEl.innerHTML = `<p>❌ ${msg}</p>`;
  if (tipsEl) tipsEl.textContent = "Check the city name or your internet connection.";
}

// AQI
function fetchAirQuality(lat, lon) {
  const airURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;

  fetch(airURL)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.list) return;

      const aqi = data.list[0].main.aqi;
      const comp = data.list[0].components;

      const statusText = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

      document.getElementById("aqi-value").textContent = aqi;
      document.getElementById("aqi-status").textContent = statusText[aqi - 1];
      document.getElementById("aqi-pm25").textContent = comp.pm2_5 + " µg/m³";
      document.getElementById("aqi-pm10").textContent = comp.pm10 + " µg/m³";
      document.getElementById("aqi-co").textContent = comp.co + " µg/m³";
      document.getElementById("aqi-no2").textContent = comp.no2 + " µg/m³";
      document.getElementById("aqi-so2").textContent = comp.so2 + " µg/m³";
      document.getElementById("aqi-o3").textContent = comp.o3 + " µg/m³";

      // Health warnings based on AQI
      const healthBox = document.getElementById("aqi-health");
      let warningText = "";
      let color = "";

      // AQI scale:
      // 1 = Good
      // 2 = Fair
      // 3 = Moderate
      // 4 = Poor
      // 5 = Very Poor

      switch (aqi) {
        case 1:
          warningText = "Air quality is good. No health risks!";
          color = "#2ecc71"; // green
          break;

        case 2:
          warningText = "Air quality is fair. Mild risk for very sensitive people.";
          color = "#f1c40f"; // yellow
          break;

        case 3:
          warningText = "Moderate air pollution. Children & elderly should reduce long outdoor activities.";
          color = "#e67e22"; // orange
          break;

        case 4:
          warningText = "Poor air quality! Wear a mask outside. Avoid going out for long.";
          color = "#e74c3c"; // red
          break;

        case 5:
          warningText = "Very unhealthy! Stay indoors. Avoid all outdoor exercise.";
          color = "#8e44ad"; // purple
          break;
      }

      healthBox.textContent = warningText;
      healthBox.style.background = color;

    })
    .catch(err => console.error("AQI Error:", err));
}


/************************************
 DISPLAY — Current Weather
*************************************/
function renderCurrentWeather(data, city) {
  const tempEl = document.getElementById("temp-div");
  const infoEl = document.getElementById("weather-info");
  const tipsEl = document.getElementById("weather-tips");
  const iconEl = document.getElementById("weather-icon");

  if (tempEl) tempEl.innerHTML = "";
  if (infoEl) infoEl.innerHTML = "";
  if (tipsEl) tipsEl.textContent = "";
  if (iconEl) iconEl.style.display = "none";

  // Safety checks
  if (!data || !data.main || !data.weather) {
    showError("Could not load current weather.");
    return;
  }

  // Temperature (already metric)
  const temperature = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const weatherDesc = (data.weather[0].description || "").toLowerCase();
  const iconCode = data.weather[0].icon || "01d";

  if (tempEl) tempEl.innerHTML = `<h2>${temperature}°C</h2>`;
  if (infoEl) infoEl.innerHTML = `<p>${weatherDesc}</p>`;
  if (iconEl) {
    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.alt = "Weather icon";
    iconEl.style.display = "block";
  }
  // Fetch and display AQI
  // Fetch AQI
  fetchAirQuality(data.coord.lat, data.coord.lon);


  // Extra weather info (create if missing)
  let extraEl = document.getElementById("extra-info");
  if (!extraEl) {
    extraEl = document.createElement("div");
    extraEl.id = "extra-info";
    const display = document.getElementById("weather-display");
    display && display.insertBefore(extraEl, document.getElementById("weather-tips"));
  }
  extraEl.innerHTML = `
    <p>Feels Like: ${feelsLike}°C</p>
    <p>Humidity: ${data.main.humidity}%</p>
    <p>Wind: ${data.wind?.speed ?? 0} m/s</p>
    <p>Pressure: ${data.main.pressure} hPa</p>
  `;
  // Format date & time
  const updateTime = new Date(data.dt * 1000);
  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  };
  document.getElementById("weather-updated").textContent =
    "Updated at: " + updateTime.toLocaleString("en-US", options);


  // Tips
  if (tipsEl) {
    if (temperature > 35) tipsEl.textContent = "🥵 It's very hot, stay hydrated!";
    else if (temperature < 10) tipsEl.textContent = "❄️ It's cold, wear warm clothes!";
    else if (weatherDesc.includes("rain")) tipsEl.textContent = "☔ Carry an umbrella!";
    else if (weatherDesc.includes("snow")) tipsEl.textContent = "⛄ Snow outside, dress warmly!";
    else if (weatherDesc.includes("cloud")) tipsEl.textContent = "☁️ Cloudy skies today.";
    else tipsEl.textContent = "🌤️ Nice weather, enjoy!";
  }

  // Dynamic background (skip if dark mode)
  applyDynamicStyles(weatherDesc, iconCode);

  // Local Time
  const tz = data.timezone || 0; // seconds offset
  let timeEl = document.getElementById("local-time");
  if (!timeEl) {
    timeEl = document.createElement("div");
    timeEl.id = "local-time";
    const display = document.getElementById("weather-display");
    display && display.insertBefore(timeEl, extraEl.nextSibling);
  }
  const nowUtc = Math.floor(Date.now() / 1000);
  timeEl.innerHTML = `<p>Local Time: ${fmtTime(nowUtc, tz)}</p>`;

  // Sunrise / Sunset
  let sunEl = document.getElementById("sun-times");
  if (!sunEl) {
    sunEl = document.createElement("div");
    sunEl.id = "sun-times";
    const display = document.getElementById("weather-display");
    display && display.insertBefore(sunEl, document.getElementById("weather-tips"));
  }
  if (data.sys?.sunrise && data.sys?.sunset) {
    sunEl.innerHTML = `
      <p>Sunrise: ${fmtTime(data.sys.sunrise, tz)}</p>
      <p>Sunset:  ${fmtTime(data.sys.sunset, tz)}</p>
    `;
  } else {
    sunEl.innerHTML = "";
  }

  // Save RECENT cities
  let recent = JSON.parse(localStorage.getItem("recentCities")) || [];
  if (!recent.includes(city)) {
    recent.unshift(city);
    if (recent.length > 5) recent.pop();
    localStorage.setItem("recentCities", JSON.stringify(recent));
  }
  updateRecentCities();
}


/************************************
 DISPLAY — Hourly (next 5 entries) + 5-day summary
*************************************/
function renderForecast(list, tzOffset = 0) {
  const hourlyContainer = document.getElementById("hourly-forecast");
  if (hourlyContainer) hourlyContainer.innerHTML = "";
  if (!Array.isArray(list)) return;

  // Hourly cards (next 5 items)
  list.slice(0, 5).forEach(item => {
    const temp = Math.round(item.main.temp);
    const desc = item.weather[0].description;
    const icon = item.weather[0].icon;
    const time = fmtTime(item.dt, tzOffset);

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p>${time}</p>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
      <p>${temp}°C</p>
      <p>${desc}</p>
    `;
    hourlyContainer && hourlyContainer.appendChild(card);
  });

  // Build 5-day summary if container exists
  const weeklyContainer = document.getElementById("weekly-forecast");
  if (weeklyContainer) {
    generateWeeklyForecast(list, tzOffset, weeklyContainer);
  }
}

// Build 5-day forecast from /forecast 3-hour list
function generateWeeklyForecast(list, tzOffset, weeklyContainer) {
  weeklyContainer.innerHTML = "";
  const days = new Map();

  list.forEach(item => {
    // Group by local date string (year-month-day in city time)
    const local = new Date((item.dt + tzOffset) * 1000);
    const y = local.getUTCFullYear();
    const m = String(local.getUTCMonth() + 1).padStart(2, "0");
    const d = String(local.getUTCDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const label = weekdayShort(item.dt, tzOffset);

    const temp = Math.round(item.main.temp);
    const icon = item.weather[0].icon;
    const desc = item.weather[0].description;

    if (!days.has(key)) {
      days.set(key, { min: temp, max: temp, icon, desc, label });
    } else {
      const v = days.get(key);
      v.min = Math.min(v.min, temp);
      v.max = Math.max(v.max, temp);
      // keep earliest icon/desc of the day (looks consistent)
      days.set(key, v);
    }
  });

  Array.from(days.values()).slice(0, 5).forEach(d => {
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p>${d.label}</p>
      <img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="icon">
      <p>${d.min}°C - ${d.max}°C</p>
      <p>${d.desc}</p>
    `;
    weeklyContainer.appendChild(card);
  });
}

/************************************
 RECENT CITIES
*************************************/
function updateRecentCities() {
  const container = document.getElementById("recent-cities");
  if (!container) return;
  container.innerHTML = "<h4>Recent Searches:</h4>";
  const cities = JSON.parse(localStorage.getItem("recentCities")) || [];

  cities.forEach(city => {
    const btn = document.createElement("button");
    btn.textContent = city;
    btn.className = "recent-btn";
    btn.addEventListener("click", () => {
      document.getElementById("city").value = city;
      window.fetchWeather();
    });
    container.appendChild(btn);
  });
}
updateRecentCities();



/************************************
 THEME TOGGLE (skip dynamic style if dark)
*************************************/
const themeBtn = document.getElementById("theme-toggle");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}
window.addEventListener("load", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if (themeBtn) themeBtn.textContent = "☀️";
  }
});

/************************************
 CONTACT FORM (single, de-duplicated)
*************************************/
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
if (contactForm && contactStatus) {
  contactForm.addEventListener("submit", async e => {
    e.preventDefault();
    contactStatus.textContent = "⏳ Sending...";
    try {
      await fetch(contactForm.action, {
        method: "POST",
        mode: "no-cors",
        body: new FormData(contactForm)
      });
      contactStatus.textContent = "✅ Thanks! Your message has been sent!";
      contactForm.reset();
    } catch {
      contactStatus.textContent = "❌ Failed to send message. Please try again.";
    }
  });
}

/************************************
 LOADER
*************************************/
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (loader) setTimeout(() => loader.classList.add("fade-out"), 800);
});

/************************************
 SCROLL TO TOP
*************************************/
const scrollBtn = document.getElementById("scrollTopBtn");
if (scrollBtn) {
  window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 200 ? "flex" : "none";
  });
  scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/************************************
 VOICE SEARCH
*************************************/
const micBtn = document.getElementById("voice-btn");
if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("❌ Voice recognition not supported.");
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = e => {
      const city = e.results[0][0].transcript.replace(/[^\w\s]/gi, "").trim();
      document.getElementById("city").value = city;
      window.fetchWeather();
    };
  });
}

/************************************
 GEOLOCATION (metric + safe)
*************************************/
const locationBtn = document.getElementById("loc-btn");
if (locationBtn) {
  locationBtn.addEventListener("click", async () => {
    if (!navigator.geolocation) return alert("❌ Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(showPosition, geoError);
  });
}

async function showPosition(pos) {
  try {
    const { latitude: lat, longitude: lon } = pos.coords;
    const base = "https://api.openweathermap.org/data/2.5";
    const tail = `lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;

    const current = await getJSON(`${base}/weather?${tail}`);
    renderCurrentWeather(current, current.name || "Your Location");

    const forecast = await getJSON(`${base}/forecast?${tail}`);
    const tzOffset = forecast?.city?.timezone ?? 0;
    renderForecast(forecast.list, tzOffset);
  } catch (e) {
    showError("Failed to load your location weather.");
  }
}
function geoError() {
  alert("⚠️ Location access denied.");
}

/************************************
 APPLY WEATHER STYLES (respect dark mode)
*************************************/
function applyDynamicStyles(desc, iconCode) {
  // if dark mode, don't override background
  if (document.body.classList.contains("dark")) return;

  const body = document.body;
  body.className = ""; // reset all classes

  if (desc.includes("rain")) body.classList.add("rainy");
  else if (desc.includes("cloud")) body.classList.add("cloudy");
  else if (desc.includes("snow")) body.classList.add("snowy");
  else if (desc.includes("clear") && (iconCode || "").includes("n"))
    body.classList.add("clear-night");
  else body.classList.add("sunny");
}

// rating system
function loadRatingData() {
  const data = JSON.parse(localStorage.getItem(RATING_DATA_KEY)) || { total: 0, votes: 0 };
  const userRating = parseInt(localStorage.getItem(USER_RATING_KEY)) || 0;
  return { data, userRating };
}
function saveRatingData(data) {
  localStorage.setItem(RATING_DATA_KEY, JSON.stringify(data));
}
function setUserRating(val) {
  localStorage.setItem(USER_RATING_KEY, String(val));
}

function updateRatingUI(data, userRating) {
  const avgEl = document.getElementById("rating-average");
  const countEl = document.getElementById("rating-count");
  const output = document.getElementById("rating-output");
  const stars = document.querySelectorAll(".star");

  const avg = data.votes === 0 ? 0 : (data.total / data.votes);
  avgEl.textContent = data.votes === 0 ? "-" : avg.toFixed(1);
  countEl.textContent = data.votes;

  stars.forEach((s, i) => {
    s.classList.remove("filled");
    if (i < userRating) s.classList.add("filled");
  });

  output.textContent = userRating
    ? `You rated ${userRating} ★`
    : "Click a star to rate!";
}


function initRating() {
  const stars = document.querySelectorAll(".star");
  let { data, userRating } = loadRatingData();

  updateRatingUI(data, userRating);

  stars.forEach(star => {
    const val = parseInt(star.dataset.value);

    // Hover effect
    star.addEventListener("mouseover", () => {
      stars.forEach((s, i) => {
        s.classList.toggle("preview", i < val);
      });
    });

    star.addEventListener("mouseout", () => {
      stars.forEach(s => s.classList.remove("preview"));
    });
    // Click rating with animation
    star.addEventListener("click", () => {
      // Animation: pop + sparkle
      star.classList.add("pop", "sparkle");
      setTimeout(() => {
        star.classList.remove("pop", "sparkle");
      }, 500);

      if (userRating === 0) {
        data.total += val;
        data.votes += 1;
      } else {
        data.total = data.total - userRating + val;
      }

      userRating = val;
      saveRatingData(data);
      setUserRating(val);

      updateRatingUI(data, userRating);
    });
  });
}