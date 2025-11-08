// =========================
// Configuration & API Key
// =========================
const OPENWEATHER_KEY = "54aa1e654d77ad604e546a138643d8de";

// =========================
// Get Weather Data
// =========================
function fetchWeather() {
    const cityInput = document.getElementById("city").value.trim();
    if (!cityInput) {
        alert("Please enter a city name!");
        return;
    }

    const currentURL = `https://api.openweathermap.org/data/2.5/weather?q=${cityInput}&appid=${OPENWEATHER_KEY}`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${cityInput}&appid=${OPENWEATHER_KEY}`;

    fetch(currentURL)
        .then(res => res.json())
        .then(data => renderCurrentWeather(data, cityInput))
        .catch(() => alert("Unable to load current weather."));

    fetch(forecastURL)
        .then(res => res.json())
        .then(data => renderForecast(data.list))
        .catch(() => alert("Unable to load forecast."));
}

// =========================
// Apply Dynamic Styles (fix for visibility)
// =========================
function applyDynamicStyles(weatherDesc, iconCode) {
    const body = document.body;
    const weatherBox = document.querySelector(".weather-container");
    const cards = document.querySelectorAll(".forecast-card, .section-card");

    body.className = ""; // reset

    let overlay = "rgba(0,0,0,0.5)";
    let text = "#fff";

    if (weatherDesc.includes("rain")) {
        body.classList.add("rainy");
        overlay = "rgba(0,0,0,0.55)";
        text = "#fff";
    } else if (weatherDesc.includes("cloud")) {
        body.classList.add("cloudy");
        overlay = "rgba(0,0,0,0.6)";
        text = "#fff";
    } else if (weatherDesc.includes("snow")) {
        body.classList.add("snowy");
        overlay = "rgba(255,255,255,0.6)";
        text = "#000";
    } else if (weatherDesc.includes("clear")) {
        if (iconCode.includes("n")) {
            body.classList.add("clear-night");
            overlay = "rgba(0,0,0,0.5)";
            text = "#fff";
        } else {
            body.classList.add("sunny");
            overlay = "rgba(255,255,255,0.4)";
            text = "#000";
        }
    } else {
        body.classList.add("sunny");
    }

    if (weatherBox) weatherBox.style.background = overlay;
    cards.forEach(c => (c.style.background = overlay));

    document.querySelectorAll(
        ".weather-container, .forecast-card, .section-card, #weather-display, #temp-div, #weather-info, #weather-tips"
    ).forEach(el => (el.style.color = text));
}

// =========================
// Display Current Weather
// =========================
function renderCurrentWeather(data, city) {
    const tempEl = document.getElementById("temp-div");
    const weatherEl = document.getElementById("weather-info");
    const tipsEl = document.getElementById("weather-tips");
    const iconEl = document.getElementById("weather-icon");

    tempEl.innerHTML = "";
    weatherEl.innerHTML = "";
    tipsEl.innerHTML = "";

    if (data.cod === "404") {
        weatherEl.innerHTML = `<p>${data.message}</p>`;
        return;
    }

    const temperature = Math.round(data.main.temp - 273.15);
    const weatherDesc = data.weather[0].description.toLowerCase();
    const iconCode = data.weather[0].icon;

    tempEl.innerHTML = `<h2>${temperature}°C</h2>`;
    weatherEl.innerHTML = `<p>${weatherDesc}</p>`;
    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.style.display = "block";

    if (temperature > 35) tipsEl.textContent = "🥵 It's very hot, stay hydrated!";
    else if (temperature < 10) tipsEl.textContent = "❄️ It's cold, wear warm clothes!";
    else if (weatherDesc.includes("rain")) tipsEl.textContent = "☔ Carry an umbrella!";
    else if (weatherDesc.includes("snow")) tipsEl.textContent = "⛄ Snow outside, dress warmly!";
    else if (weatherDesc.includes("cloud")) tipsEl.textContent = "☁️ Cloudy skies today.";
    else tipsEl.textContent = "🌤️ Nice weather, enjoy!";

    // ✅ Fix text visibility here
    applyDynamicStyles(weatherDesc, iconCode);

    // Save recent searches
    let recent = JSON.parse(localStorage.getItem("recentCities")) || [];
    if (!recent.includes(city)) {
        recent.unshift(city);
        if (recent.length > 5) recent.pop();
        localStorage.setItem("recentCities", JSON.stringify(recent));
    }
    updateRecentCities();
}

// =========================
// Display Forecast
// =========================
function renderForecast(list) {
    const forecastContainer = document.getElementById("hourly-forecast");
    forecastContainer.innerHTML = "";

    list.slice(0, 5).forEach(item => {
        const temp = Math.round(item.main.temp - 273.15);
        const desc = item.weather[0].description;
        const icon = item.weather[0].icon;
        const time = new Date(item.dt * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p>${time}</p>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
            <p>${temp}°C</p>
            <p>${desc}</p>
        `;
        forecastContainer.appendChild(card);
    });
}

// =========================
// Recent Cities
// =========================
function updateRecentCities() {
    const container = document.getElementById("recent-cities");
    container.innerHTML = "<h4>Recent Searches:</h4>";
    const cities = JSON.parse(localStorage.getItem("recentCities")) || [];

    cities.forEach(city => {
        const btn = document.createElement("button");
        btn.textContent = city;
        btn.className = "recent-btn";
        btn.addEventListener("click", () => {
            document.getElementById("city").value = city;
            fetchWeather();
        });
        container.appendChild(btn);
    });
}
updateRecentCities();

// =========================
// Theme Toggle
// =========================
const themeBtn = document.getElementById("theme-toggle");
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
});
window.addEventListener("load", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        themeBtn.textContent = "☀️";
    }
});

// =========================
// Rating System
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const stars = document.querySelectorAll(".star");
    const output = document.getElementById("rating-output");
    const avg = document.getElementById("rating-average");
    const count = document.getElementById("rating-count");

    let total = 0;
    let votes = 0;

    stars.forEach((star, idx) => {
        star.addEventListener("click", () => {
            const val = parseInt(star.dataset.value);
            total += val;
            votes++;
            avg.textContent = (total / votes).toFixed(1);
            count.textContent = votes;
            output.textContent = `You rated ${val} stars!`;

            stars.forEach(s => s.classList.remove("filled"));
            for (let i = 0; i < val; i++) stars[i].classList.add("filled");
        });
    });
});

// =========================
// Contact Form
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("contact-status");
    if (!form) return;

    form.addEventListener("submit", e => {
        e.preventDefault();
        status.textContent = "✅ Thanks! Your message has been sent!";
        form.reset();
    });
});

// =========================
// Contact Form Submission
// =========================
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");

if (contactForm) {
  contactForm.addEventListener("submit", e => {
    e.preventDefault();
    contactStatus.textContent = "⏳ Sending...";

    fetch(contactForm.action, {
      method: "POST",
      mode: "no-cors",
      body: new FormData(contactForm)
    })
    .then(() => {
      contactStatus.textContent = "✅ Thanks! Your message has been sent!";
      contactForm.reset();
    })
    .catch(() => {
      contactStatus.textContent = "❌ Failed to send message. Please try again.";
    });
  });
}


// =========================
// Loader
// =========================
window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    if (loader) {
        setTimeout(() => loader.classList.add("fade-out"), 800);
    }
});

// =========================
// Scroll To Top
// =========================
const scrollBtn = document.getElementById("scrollTopBtn");
window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 200 ? "flex" : "none";
});
scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// =========================
// Voice Search
// =========================
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
            fetchWeather();
        };
    });
}

// =========================
// Geolocation
// =========================
const locationBtn = document.getElementById("loc-btn");
if (locationBtn) {
    locationBtn.addEventListener("click", () => {
        if (!navigator.geolocation) return alert("❌ Geolocation not supported.");
        navigator.geolocation.getCurrentPosition(showPosition, geoError);
    });
}
function showPosition(pos) {
    const { latitude: lat, longitude: lon } = pos.coords;
    const currentURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;
    const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;

    fetch(currentURL).then(r => r.json()).then(data => renderCurrentWeather(data, data.name));
    fetch(forecastURL).then(r => r.json()).then(data => renderForecast(data.list));
}
function geoError() {
    alert("⚠️ Location access denied.");
}


