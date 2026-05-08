const KM_PER_MILE = 1.609344;
const RIEGEL_EXPONENT = 1.06;

const elements = {
  form: document.querySelector("#calculator"),
  distance: document.querySelector("#distance"),
  customDistance: document.querySelector("#customDistance"),
  customDistanceValue: document.querySelector("#customDistanceValue"),
  customDistanceUnit: document.querySelector("#customDistanceUnit"),
  timeInputs: document.querySelector("#timeInputs"),
  paceInputs: document.querySelector("#paceInputs"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
  paceMinutes: document.querySelector("#paceMinutes"),
  paceSeconds: document.querySelector("#paceSeconds"),
  paceUnit: document.querySelector("#paceUnit"),
  thresholdMethod: document.querySelector("#thresholdMethod"),
  model: document.querySelector("#model"),
  useSecondEffort: document.querySelector("#useSecondEffort"),
  secondaryEffort: document.querySelector("#secondaryEffort"),
  secondDistance: document.querySelector("#secondDistance"),
  secondCustomDistance: document.querySelector("#secondCustomDistance"),
  secondCustomDistanceValue: document.querySelector("#secondCustomDistanceValue"),
  secondCustomDistanceUnit: document.querySelector("#secondCustomDistanceUnit"),
  secondHours: document.querySelector("#secondHours"),
  secondMinutes: document.querySelector("#secondMinutes"),
  secondSeconds: document.querySelector("#secondSeconds"),
  temperature: document.querySelector("#temperature"),
  temperatureUnit: document.querySelector("#temperatureUnit"),
  humidity: document.querySelector("#humidity"),
  profileDistance: document.querySelector("#profileDistance"),
  profileDistanceUnit: document.querySelector("#profileDistanceUnit"),
  elevationGain: document.querySelector("#elevationGain"),
  elevationLoss: document.querySelector("#elevationLoss"),
  elevationUnit: document.querySelector("#elevationUnit"),
  thresholdPace: document.querySelector("#thresholdPace"),
  pureThreshold: document.querySelector("#pureThreshold"),
  thresholdMile: document.querySelector("#thresholdMile"),
  hourDistance: document.querySelector("#hourDistance"),
  raceSummary: document.querySelector("#raceSummary"),
  trainingBand: document.querySelector("#trainingBand"),
  pureTrainingBand: document.querySelector("#pureTrainingBand"),
  weatherEffect: document.querySelector("#weatherEffect"),
  elevationEffect: document.querySelector("#elevationEffect"),
  totalAdjustment: document.querySelector("#totalAdjustment"),
  conditionNote: document.querySelector("#conditionNote"),
  riegelEstimate: document.querySelector("#riegelEstimate"),
  vdotEstimate: document.querySelector("#vdotEstimate"),
  criticalEstimate: document.querySelector("#criticalEstimate"),
  modelSpread: document.querySelector("#modelSpread"),
  timeIntervalTable: document.querySelector("#timeIntervalTable"),
  distanceIntervalTable: document.querySelector("#distanceIntervalTable"),
  racePredictionTable: document.querySelector("#racePredictionTable"),
  confidence: document.querySelector("#confidence"),
  canvas: document.querySelector("#paceCanvas"),
};

const modelAdjustments = {
  conservative: 1.015,
  balanced: 1,
  aggressive: 0.99,
};

let profileDistanceTouched = false;

function numberValue(input) {
  return Number.parseFloat(input.value) || 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getInputMode() {
  return document.querySelector("input[name='inputMode']:checked").value;
}

function getDistanceKm() {
  if (elements.distance.value !== "custom") {
    return Number.parseFloat(elements.distance.value);
  }

  const rawDistance = Math.max(numberValue(elements.customDistanceValue), 0.1);
  return elements.customDistanceUnit.value === "mi" ? rawDistance * KM_PER_MILE : rawDistance;
}

function getSecondDistanceKm() {
  if (elements.secondDistance.value !== "custom") {
    return Number.parseFloat(elements.secondDistance.value);
  }

  const rawDistance = Math.max(numberValue(elements.secondCustomDistanceValue), 0.1);
  return elements.secondCustomDistanceUnit.value === "mi" ? rawDistance * KM_PER_MILE : rawDistance;
}

function getRaceSeconds(distanceKm) {
  if (getInputMode() === "pace") {
    const paceSeconds = numberValue(elements.paceMinutes) * 60 + numberValue(elements.paceSeconds);
    const secondsPerKm = elements.paceUnit.value === "mi" ? paceSeconds / KM_PER_MILE : paceSeconds;
    return Math.max(secondsPerKm * distanceKm, 1);
  }

  return Math.max(
    numberValue(elements.hours) * 3600 + numberValue(elements.minutes) * 60 + numberValue(elements.seconds),
    1,
  );
}

function getSecondRaceSeconds() {
  return Math.max(
    numberValue(elements.secondHours) * 3600 +
      numberValue(elements.secondMinutes) * 60 +
      numberValue(elements.secondSeconds),
    1,
  );
}

function getTemperatureC() {
  const temperature = numberValue(elements.temperature);
  return elements.temperatureUnit.value === "f" ? (temperature - 32) * (5 / 9) : temperature;
}

function getElevationProfile() {
  const distanceRaw = Math.max(numberValue(elements.profileDistance), 0.1);
  const distanceKm = elements.profileDistanceUnit.value === "mi" ? distanceRaw * KM_PER_MILE : distanceRaw;
  const unitMultiplier = elements.elevationUnit.value === "ft" ? 0.3048 : 1;

  return {
    distanceKm,
    gainMeters: Math.max(numberValue(elements.elevationGain), 0) * unitMultiplier,
    lossMeters: Math.max(numberValue(elements.elevationLoss), 0) * unitMultiplier,
  };
}

function syncProfileDistance(distanceKm) {
  if (profileDistanceTouched) {
    return;
  }

  const displayDistance = elements.profileDistanceUnit.value === "mi" ? distanceKm / KM_PER_MILE : distanceKm;
  elements.profileDistance.value = displayDistance.toFixed(displayDistance >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

function formatClock(totalSeconds) {
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatPace(secondsPerKm, unit = "km") {
  const seconds = unit === "mi" ? secondsPerKm * KM_PER_MILE : secondsPerKm;
  return `${formatClock(seconds)} / ${unit === "mi" ? "mi" : "km"}`;
}

function formatDistance(distanceKm) {
  if (distanceKm < 1.1) {
    return `${(distanceKm * 1000).toFixed(0)} m`;
  }
  if (Math.abs(distanceKm - KM_PER_MILE) < 0.01) {
    return "1 mile";
  }
  if (Math.abs(distanceKm - 21.0975) < 0.01) {
    return "Half marathon";
  }
  if (Math.abs(distanceKm - 42.195) < 0.01) {
    return "Marathon";
  }
  const fixedDistance = distanceKm.toFixed(distanceKm >= 10 ? 1 : 2).replace(/\.?0+$/, "");
  return `${fixedDistance} km`;
}

function getRiegelThreshold(distanceKm, raceSeconds) {
  const predictedHourDistanceKm = distanceKm * (3600 / raceSeconds) ** (1 / RIEGEL_EXPONENT);
  return {
    label: "Riegel",
    secondsPerKm: 3600 / predictedHourDistanceKm,
    hourDistanceKm: predictedHourDistanceKm,
    weight: 1,
  };
}

function getOxygenCost(velocityMetersPerMinute) {
  return -4.6 + 0.182258 * velocityMetersPerMinute + 0.000104 * velocityMetersPerMinute ** 2;
}

function getRaceFraction(durationMinutes) {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMinutes) +
    0.2989558 * Math.exp(-0.1932605 * durationMinutes)
  );
}

function getVelocityFromOxygenCost(targetOxygenCost) {
  let low = 50;
  let high = 500;

  for (let i = 0; i < 40; i += 1) {
    const midpoint = (low + high) / 2;
    if (getOxygenCost(midpoint) < targetOxygenCost) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

function getVdotThreshold(distanceKm, raceSeconds) {
  const durationMinutes = raceSeconds / 60;
  const velocityMetersPerMinute = (distanceKm * 1000) / durationMinutes;
  const vdot = getOxygenCost(velocityMetersPerMinute) / getRaceFraction(durationMinutes);
  const thresholdVelocity = getVelocityFromOxygenCost(vdot * getRaceFraction(60));

  return {
    label: "VDOT",
    secondsPerKm: 1000 / (thresholdVelocity / 60),
    vdot,
    weight: 1,
  };
}

function getCriticalSpeedThreshold(primaryDistanceKm, primarySeconds) {
  if (!elements.useSecondEffort.checked) {
    return null;
  }

  const secondDistanceKm = getSecondDistanceKm();
  const secondSeconds = getSecondRaceSeconds();
  const efforts = [
    { distanceMeters: primaryDistanceKm * 1000, seconds: primarySeconds },
    { distanceMeters: secondDistanceKm * 1000, seconds: secondSeconds },
  ].sort((a, b) => a.seconds - b.seconds);

  const timeDelta = efforts[1].seconds - efforts[0].seconds;
  const distanceDelta = efforts[1].distanceMeters - efforts[0].distanceMeters;

  if (timeDelta < 120 || distanceDelta <= 0) {
    return null;
  }

  const criticalSpeedMetersPerSecond = distanceDelta / timeDelta;
  const secondsPerKm = 1000 / criticalSpeedMetersPerSecond;

  if (!Number.isFinite(secondsPerKm) || secondsPerKm < 120 || secondsPerKm > 720) {
    return null;
  }

  return {
    label: "Critical speed",
    secondsPerKm,
    weight: 1.2,
  };
}

function blendEstimates(estimates) {
  const weightedSpeed = estimates.reduce((sum, estimate) => sum + (1000 / estimate.secondsPerKm) * estimate.weight, 0);
  const totalWeight = estimates.reduce((sum, estimate) => sum + estimate.weight, 0);
  return 1000 / (weightedSpeed / totalWeight);
}

function getModelSpread(estimates) {
  if (estimates.length < 2) {
    return 0;
  }

  const paces = estimates.map((estimate) => estimate.secondsPerKm);
  const center = blendEstimates(estimates);
  return ((Math.max(...paces) - Math.min(...paces)) / center) * 100;
}

function predictThreshold(distanceKm, raceSeconds) {
  const riegel = getRiegelThreshold(distanceKm, raceSeconds);
  const vdot = getVdotThreshold(distanceKm, raceSeconds);
  const critical = getCriticalSpeedThreshold(distanceKm, raceSeconds);
  const estimates = [riegel, vdot, critical].filter(Boolean);
  const method = elements.thresholdMethod.value;

  let selectedSecondsPerKm = blendEstimates(estimates);
  let selectedLabel = "Blend";

  if (method === "riegel") {
    selectedSecondsPerKm = riegel.secondsPerKm;
    selectedLabel = "Riegel";
  } else if (method === "vdot") {
    selectedSecondsPerKm = vdot.secondsPerKm;
    selectedLabel = "VDOT";
  } else if (method === "critical" && critical) {
    selectedSecondsPerKm = critical.secondsPerKm;
    selectedLabel = "Critical speed";
  }

  const adjustedSecondsPerKm = selectedSecondsPerKm * modelAdjustments[elements.model.value];

  return {
    method: selectedLabel,
    hourDistanceKm: 3600 / adjustedSecondsPerKm,
    secondsPerKm: adjustedSecondsPerKm,
    riegel,
    vdot,
    critical,
    estimates,
    spreadPercent: getModelSpread(estimates),
  };
}

function getTrainingBand(secondsPerKm) {
  return {
    low: secondsPerKm * 1.012,
    high: secondsPerKm * 1.032,
  };
}

function getIntervalRange(secondsPerKm, easyMultiplier, steadyMultiplier) {
  return {
    fast: secondsPerKm * easyMultiplier,
    slow: secondsPerKm * steadyMultiplier,
  };
}

function getIntervalRows(secondsPerKm) {
  return {
    time: [
      {
        label: "3-4 min",
        repeat: "8-12x",
        rest: "60 sec",
        range: getIntervalRange(secondsPerKm, 1.005, 1.025),
      },
      {
        label: "6-8 min",
        repeat: "4-6x",
        rest: "90 sec",
        range: getIntervalRange(secondsPerKm, 1.015, 1.035),
      },
      {
        label: "10-12 min",
        repeat: "3x",
        rest: "120 sec",
        range: getIntervalRange(secondsPerKm, 1.025, 1.045),
      },
    ],
    distance: [
      {
        label: "1 km",
        repeat: "8-12x",
        rest: "60 sec",
        range: getIntervalRange(secondsPerKm, 1.005, 1.025),
      },
      {
        label: "2 km",
        repeat: "4-6x",
        rest: "90 sec",
        range: getIntervalRange(secondsPerKm, 1.015, 1.035),
      },
      {
        label: "3 km",
        repeat: "3x",
        rest: "120 sec",
        range: getIntervalRange(secondsPerKm, 1.025, 1.045),
      },
    ],
  };
}

function formatPaceRange(range) {
  const fast = formatPace(range.fast, "km").replace(" / km", "");
  const slow = formatPace(range.slow, "km");
  return `${fast}-${slow}`;
}

function renderIntervalTable(container, rows) {
  container.innerHTML = rows
    .map(
      (row) => `
        <div class="interval-row">
          <div><span>Work</span><strong>${row.label}</strong></div>
          <div><span>Pace range</span><strong>${formatPaceRange(row.range)}</strong></div>
          <div><span>Repeat</span><strong>${row.repeat}</strong></div>
          <div><span>Rest</span><strong>${row.rest}</strong></div>
        </div>
      `,
    )
    .join("");
}

function getRacePredictions(pureSecondsPerKm, conditionFactor, modelSpreadPercent) {
  const hourDistanceKm = 3600 / pureSecondsPerKm;
  const spreadPadding = Math.min(Math.max(modelSpreadPercent / 2, 0.8), 3.5);
  const races = [
    { label: "5K", distanceKm: 5, uncertainty: 1.4 },
    { label: "10K", distanceKm: 10, uncertainty: 1.6 },
    { label: "Half marathon", distanceKm: 21.0975, uncertainty: 2.2 },
    { label: "Marathon", distanceKm: 42.195, uncertainty: 3.2 },
  ];

  return races.map((race) => {
    const pureSeconds = 3600 * (race.distanceKm / hourDistanceKm) ** RIEGEL_EXPONENT;
    const actualSeconds = pureSeconds * conditionFactor;
    const rangePercent = (race.uncertainty + spreadPadding) / 100;

    return {
      ...race,
      purePace: pureSeconds / race.distanceKm,
      actualPace: actualSeconds / race.distanceKm,
      lowPace: (actualSeconds / race.distanceKm) * (1 - rangePercent),
      highPace: (actualSeconds / race.distanceKm) * (1 + rangePercent),
      lowTime: actualSeconds * (1 - rangePercent),
      highTime: actualSeconds * (1 + rangePercent),
    };
  });
}

function renderRacePredictions(container, predictions) {
  container.innerHTML = predictions
    .map(
      (race) => `
        <div class="race-row">
          <div><span>Race</span><strong>${race.label}</strong></div>
          <div><span>Actual pace range</span><strong>${formatPace(race.lowPace, "km").replace(" / km", "")}-${formatPace(race.highPace, "km")}</strong></div>
          <div><span>Pure pace</span><strong>${formatPace(race.purePace, "km")}</strong></div>
          <div><span>Finish range</span><strong>${formatClock(race.lowTime)}-${formatClock(race.highTime)}</strong></div>
        </div>
      `,
    )
    .join("");
}

function getWeatherAdjustment(tempC, humidity) {
  const rh = clamp(humidity, 0, 100);
  const heatDegrees = Math.max(0, tempC - 12);
  const humidityMultiplier = 0.75 + rh / 125;
  const heatPenalty = Math.min(0.12, heatDegrees * humidityMultiplier * 0.00135);
  const humidityPenalty = Math.min(0.025, Math.max(0, rh - 65) * Math.max(0, tempC - 18) * 0.000025);
  const coldPenalty = Math.min(0.025, Math.max(0, 0 - tempC) * 0.001);
  const penalty = heatPenalty + humidityPenalty + coldPenalty;

  return {
    factor: 1 + penalty,
    percent: penalty * 100,
  };
}

function getElevationAdjustment(profile) {
  const routeMeters = Math.max(profile.distanceKm * 1000, 100);
  const climbGrade = profile.gainMeters / routeMeters;
  const descentGrade = profile.lossMeters / routeMeters;
  const gainPenalty = Math.min(0.14, climbGrade * 3.0);
  const descentCredit = Math.min(0.018, descentGrade * 0.7);
  const steepDescentPenalty = Math.max(0, descentGrade - 0.04) * 0.8;
  const adjustment = clamp(gainPenalty - descentCredit + steepDescentPenalty, -0.015, 0.16);

  return {
    factor: 1 + adjustment,
    percent: adjustment * 100,
  };
}

function getConditionAdjustment() {
  const weather = getWeatherAdjustment(getTemperatureC(), numberValue(elements.humidity));
  const elevation = getElevationAdjustment(getElevationProfile());
  const factor = weather.factor * elevation.factor;

  return {
    weather,
    elevation,
    factor,
    percent: (factor - 1) * 100,
  };
}

function getConfidence(distanceKm, raceSeconds) {
  const raceMinutes = raceSeconds / 60;
  if (distanceKm < 1.5 || raceMinutes < 4) {
    return "Speed-biased input";
  }
  if (distanceKm > 30 || raceMinutes > 180) {
    return "Endurance-biased input";
  }
  if (raceMinutes >= 45 && raceMinutes <= 75) {
    return "Very strong input";
  }
  return "Good input";
}

function formatPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getConditionNote(adjustment) {
  if (adjustment.percent < 0.3) {
    return "Conditions are close to neutral. The pure threshold and actual threshold should be almost interchangeable today.";
  }
  if (adjustment.weather.percent > adjustment.elevation.percent && adjustment.weather.percent > 2) {
    return "Weather is the main limiter. Keep the actual threshold target, and let heart rate or breathing cap the effort if heat builds late.";
  }
  if (adjustment.elevation.percent > 2) {
    return "Elevation is the main limiter. Use the adjusted pace for the route, but judge climbs by effort rather than forcing even splits.";
  }
  return "Use pure threshold to track fitness. Use actual threshold when pacing this specific route or weather condition.";
}

function getMethodNote(threshold, adjustment) {
  const baseNote = getConditionNote(adjustment);
  const spread = threshold.spreadPercent;
  if (elements.thresholdMethod.value === "critical" && !threshold.critical) {
    return `Critical Speed needs two all-out efforts with different distances. The app is temporarily using the Riegel/VDOT blend. ${baseNote}`;
  }
  if (threshold.method === "Blend" && threshold.estimates.length >= 3) {
    return `Blended estimate uses Riegel, VDOT, and Critical Speed. ${baseNote}`;
  }
  if (threshold.method === "Blend") {
    return `Blended estimate uses Riegel and VDOT. Add a second effort to include Critical Speed. ${baseNote}`;
  }
  if (spread > 5) {
    return `${threshold.method} is selected, but the models disagree by ${spread.toFixed(1)}%. Check whether the race inputs are equally recent and all-out.`;
  }
  return `${threshold.method} is selected. ${baseNote}`;
}

function drawChart(actualSecondsPerKm, raceSeconds, distanceKm, pureSecondsPerKm) {
  const canvas = elements.canvas;
  const ctx = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  ctx.scale(pixelRatio, pixelRatio);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(31, 122, 88, 0.2)");
  gradient.addColorStop(0.6, "rgba(217, 158, 43, 0.12)");
  gradient.addColorStop(1, "rgba(189, 89, 53, 0.14)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const padX = Math.max(24, width * 0.07);
  const padY = Math.max(24, height * 0.16);
  const chartWidth = width - padX * 2;
  const chartHeight = height - padY * 1.5;

  ctx.strokeStyle = "rgba(21, 23, 19, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padY + (chartHeight * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
  }

  const distances = [3, 5, 10, 15, 21.0975, 42.195];
  const sourcePace = raceSeconds / distanceKm;
  const paces = distances.map((d) => sourcePace * (d / distanceKm) ** (RIEGEL_EXPONENT - 1));
  const minPace = Math.min(...paces, pureSecondsPerKm, actualSecondsPerKm) * 0.96;
  const maxPace = Math.max(...paces, pureSecondsPerKm, actualSecondsPerKm) * 1.05;

  function xForIndex(index) {
    return padX + (chartWidth * index) / (distances.length - 1);
  }

  function yForPace(pace) {
    return padY + ((pace - minPace) / (maxPace - minPace)) * chartHeight;
  }

  ctx.beginPath();
  distances.forEach((distance, index) => {
    const x = xForIndex(index);
    const y = yForPace(paces[index]);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = "#19727b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const hourDistance = distanceKm * (3600 / raceSeconds) ** (1 / RIEGEL_EXPONENT);
  const nearestIndex = distances.reduce((bestIndex, distance, index) => {
    return Math.abs(distance - hourDistance) < Math.abs(distances[bestIndex] - hourDistance) ? index : bestIndex;
  }, 0);
  const markerX = xForIndex(nearestIndex);
  const pureMarkerY = yForPace(pureSecondsPerKm);
  const actualMarkerY = yForPace(actualSecondsPerKm);

  ctx.strokeStyle = "rgba(189, 89, 53, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(markerX, pureMarkerY);
  ctx.lineTo(markerX, actualMarkerY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#1f7a58";
  ctx.beginPath();
  ctx.arc(markerX, pureMarkerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#bd5935";
  ctx.beginPath();
  ctx.arc(markerX, actualMarkerY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(21, 23, 19, 0.65)";
  ctx.textAlign = "center";
  distances.forEach((distance, index) => {
    const label = distance === 21.0975 ? "HM" : distance === 42.195 ? "M" : `${distance}K`;
    ctx.fillText(label, xForIndex(index), height - 18);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#151713";
  ctx.font = "800 14px Inter, system-ui, sans-serif";
  ctx.fillText("Pure curve + actual condition marker", padX, padY - 10);
}

function updateInterface() {
  const mode = getInputMode();
  const distanceKm = getDistanceKm();
  syncProfileDistance(distanceKm);
  const raceSeconds = getRaceSeconds(distanceKm);
  const threshold = predictThreshold(distanceKm, raceSeconds);
  const adjustment = getConditionAdjustment();
  const pureSecondsPerKm = threshold.secondsPerKm;
  const actualSecondsPerKm = pureSecondsPerKm * adjustment.factor;
  const pureBand = getTrainingBand(pureSecondsPerKm);
  const actualBand = getTrainingBand(actualSecondsPerKm);

  elements.customDistance.hidden = elements.distance.value !== "custom";
  elements.timeInputs.hidden = mode !== "time";
  elements.paceInputs.hidden = mode !== "pace";
  elements.secondaryEffort.hidden = !elements.useSecondEffort.checked;
  elements.secondCustomDistance.hidden = !elements.useSecondEffort.checked || elements.secondDistance.value !== "custom";

  elements.thresholdPace.textContent = formatPace(actualSecondsPerKm, "km");
  elements.pureThreshold.textContent = formatPace(pureSecondsPerKm, "km");
  elements.thresholdMile.textContent = formatPace(actualSecondsPerKm, "mi");
  elements.hourDistance.textContent = `${threshold.hourDistanceKm.toFixed(1)} km`;
  elements.raceSummary.textContent = `${formatDistance(distanceKm)} in ${formatClock(raceSeconds)}`;
  elements.trainingBand.textContent = `${formatPace(actualBand.low, "km").replace(" / km", "")}-${formatPace(actualBand.high, "km")}`;
  elements.pureTrainingBand.textContent = `${formatPace(pureBand.low, "km").replace(" / km", "")}-${formatPace(pureBand.high, "km")}`;
  elements.weatherEffect.textContent = formatPercent(adjustment.weather.percent);
  elements.elevationEffect.textContent = formatPercent(adjustment.elevation.percent);
  elements.totalAdjustment.textContent = formatPercent(adjustment.percent);
  elements.conditionNote.textContent = getMethodNote(threshold, adjustment);
  elements.riegelEstimate.textContent = formatPace(threshold.riegel.secondsPerKm, "km");
  elements.vdotEstimate.textContent = formatPace(threshold.vdot.secondsPerKm, "km");
  elements.criticalEstimate.textContent = threshold.critical
    ? formatPace(threshold.critical.secondsPerKm, "km")
    : "Add second effort";
  elements.modelSpread.textContent = formatPercent(threshold.spreadPercent).replace("+", "");
  const intervalRows = getIntervalRows(actualSecondsPerKm);
  renderIntervalTable(elements.timeIntervalTable, intervalRows.time);
  renderIntervalTable(elements.distanceIntervalTable, intervalRows.distance);
  renderRacePredictions(
    elements.racePredictionTable,
    getRacePredictions(pureSecondsPerKm, adjustment.factor, threshold.spreadPercent),
  );
  elements.confidence.textContent =
    elements.thresholdMethod.value === "critical" && !threshold.critical
      ? "Needs second effort"
      : getConfidence(distanceKm, raceSeconds);

  drawChart(actualSecondsPerKm, raceSeconds, distanceKm, pureSecondsPerKm);
}

elements.form.addEventListener("input", updateInterface);
elements.form.addEventListener("change", updateInterface);
elements.profileDistance.addEventListener("input", () => {
  profileDistanceTouched = true;
});
elements.profileDistanceUnit.addEventListener("change", () => {
  profileDistanceTouched = true;
});
window.addEventListener("resize", updateInterface);

updateInterface();
