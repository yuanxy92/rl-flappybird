/**
 * The script just contains handlers for making the game configurable. Nothing of much interest here ^__^
 * 
 * Author @nellex
 */

var isEnvironmentStatic = true;
var displayTarget = false;
var HUMAN_DIFFICULTY_DELAYS = {
    easy: 110,
    medium: 70,
    hard: 45
};
var qVizLastRenderMs = 0;
var rewardVizLastRenderMs = 0;

function getHiDPICanvasContext(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var cssWidth = canvas.clientWidth || canvas.width;
    var cssHeight = canvas.clientHeight || canvas.height;
    var targetWidth = Math.max(1, Math.round(cssWidth * dpr));
    var targetHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return {
        ctx: ctx,
        width: cssWidth,
        height: cssHeight
    };
}

function applyGameDelay(delayMs) {
    clearInterval(eventLoop);
    eventLoop = setInterval(loop, delayMs);
}

function applyGameSpeed(speedValue) {
    var delay = 100 - speedValue;
    if (delay < 10) {
        delay = 10;
    }
    if (delay > 200) {
        delay = 200;
    }
    clearInterval(eventLoop);
    eventLoop = setInterval(loop, delay);
}

function gameSpeedChange(curSpeed) {
    if (!isAutoPlay) {
        syncModeControls();
        return;
    }
    applyGameSpeed(parseInt(curSpeed, 10));
}

function humanDifficultyChange(difficulty) {
    if (!(difficulty in HUMAN_DIFFICULTY_DELAYS)) {
        return;
    }
    humanDifficulty = difficulty;
    if (!isAutoPlay) {
        applyGameDelay(HUMAN_DIFFICULTY_DELAYS[humanDifficulty]);
    }
    updateDashboard();
}

function toggleDisplayTarget(showTarget) {
    if (showTarget == "Yes") {
        displayTarget = true;
    } else {
        displayTarget = false;
    }
}

function environmentChange(curEnv) {
    if (curEnv == "Static") {
        isEnvironmentStatic = true;
    } else {
        isEnvironmentStatic = false;
    }
}

function saveModel() {
    window.localStorage.setItem("flappybird-qtable", JSON.stringify(Q_table));
    alert("Model was saved successfully!");
}

function loadModel() {
    if (window.localStorage.getItem("flappybird-qtable") != null) {
        Q_table = JSON.parse(window.localStorage.getItem("flappybird-qtable"));
        renderQTableVisualization(true);
        alert("Model was loaded successfully!");
    } else {
        alert("No saved model found in local storage");
    }
}

var getJSON = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        resolve(xhr.response);
      } else {
        reject(status);
      }
    };
    xhr.send();
  });
};

function loadPreModel() {
    var href = window.location.href;
    var host = href.substring(0, href.lastIndexOf('/'));
    getJSON(host + "/model/qtable-x3-y6.json").then(function(data) {
        Q_table = eval(data);
        renderQTableVisualization(true);
        alert("Model loaded successfully!");
    }, function(status) {
    alert("Failure in loading pre-trained model");
    });
}

function playerModeChange(mode) {
    isAutoPlay = (mode == "QLearning");
    frameBuffer = [];
    episodeFrameCount = 0;
    targetTubeIndex = -1;
    startGame();
    if (isAutoPlay) {
        gameState = GAME;
    } else {
        gameState = HOME;
    }
    syncModeControls();
    updateDashboard();
}

function syncModeControls() {
    var speedSlider = document.getElementById("tel1");
    var difficultySelect = document.getElementById("human-difficulty");
    if (!speedSlider) {
        return;
    }

    if (isAutoPlay) {
        speedSlider.disabled = false;
        if (difficultySelect) {
            difficultySelect.disabled = true;
        }
        applyGameSpeed(parseInt(speedSlider.value, 10));
    } else {
        speedSlider.value = Math.max(0, 100 - HUMAN_DIFFICULTY_DELAYS[humanDifficulty]);
        speedSlider.disabled = true;
        if (difficultySelect) {
            difficultySelect.disabled = false;
            difficultySelect.value = humanDifficulty;
        }
        applyGameDelay(HUMAN_DIFFICULTY_DELAYS[humanDifficulty]);
    }
}

function learningParamChange() {
    var alphaRange = document.getElementById("alpha-range");
    var gammaRange = document.getElementById("gamma-range");
    var epsilonRange = document.getElementById("epsilon-range");
    var tieJumpRange = document.getElementById("tie-jump-range");

    if (alphaRange) {
        alpha = parseFloat(alphaRange.value);
        document.getElementById("alpha-value").innerText = alpha.toFixed(2);
    }
    if (gammaRange) {
        gamma = parseFloat(gammaRange.value);
        document.getElementById("gamma-value").innerText = gamma.toFixed(2);
    }
    if (epsilonRange) {
        epsilon = parseFloat(epsilonRange.value);
        document.getElementById("epsilon-value").innerText = epsilon.toFixed(3);
    }
    if (tieJumpRange) {
        tieJumpProbability = parseFloat(tieJumpRange.value);
        document.getElementById("tie-jump-value").innerText = tieJumpProbability.toFixed(2);
    }
    renderQTableVisualization(true);
}

function vizSpeedYChange(value) {
    var speedValue = parseInt(value, 10);
    var speedLabel = document.getElementById("viz-speed-y-value");
    if (speedLabel) {
        speedLabel.innerText = speedValue.toString();
    }
    renderQTableVisualization(true);
}

function syncLearningControlsFromModel() {
    var alphaRange = document.getElementById("alpha-range");
    var gammaRange = document.getElementById("gamma-range");
    var epsilonRange = document.getElementById("epsilon-range");
    var tieJumpRange = document.getElementById("tie-jump-range");

    if (alphaRange) alphaRange.value = alpha.toFixed(2);
    if (gammaRange) gammaRange.value = gamma.toFixed(2);
    if (epsilonRange) epsilonRange.value = epsilon.toFixed(3);
    if (tieJumpRange) tieJumpRange.value = tieJumpProbability.toFixed(2);
    learningParamChange();
}

function renderQTableVisualization(force) {
    var now = Date.now();
    if (!force && now - qVizLastRenderMs < 250) {
        return;
    }
    qVizLastRenderMs = now;

    var canvas = document.getElementById("qtable-canvas");
    var speedInput = document.getElementById("viz-speed-y");
    var legend = document.getElementById("qtable-legend");
    if (!canvas || !speedInput) {
        return;
    }
    var hi = getHiDPICanvasContext(canvas);
    var ctx = hi.ctx;
    var width = hi.width;
    var height = hi.height;
    var padLeft = 66;
    var padRight = 22;
    var padTop = 12;
    var padBottom = 34;
    var plotW = width - padLeft - padRight;
    var plotH = height - padTop - padBottom;
    var rows = 41; // diffY -20..20
    var cols = 29; // tubeX 0..28
    var cellW = plotW / cols;
    var cellH = plotH / rows;
    var speedY = parseInt(speedInput.value, 10);
    var speedLabel = document.getElementById("viz-speed-y-value");
    if (speedLabel) {
        speedLabel.innerText = speedY.toString();
    }

    ctx.clearRect(0, 0, width, height);
    for (var r = 0; r < rows; r++) {
        var diffY = 20 - r;
        for (var c = 0; c < cols; c++) {
            var tubeX = c;
            var state = { diffY: diffY, speedY: speedY, tubeX: tubeX };
            var qStay = getQ(state, actionSet.STAY);
            var qJump = getQ(state, actionSet.JUMP);
            var delta = qJump - qStay;
            var intensity = Math.min(1, Math.abs(delta) / 8);
            if (delta > 0) {
                ctx.fillStyle = "rgba(214,53,53," + (0.1 + 0.9 * intensity) + ")";
            } else if (delta < 0) {
                ctx.fillStyle = "rgba(31,105,214," + (0.1 + 0.9 * intensity) + ")";
            } else {
                ctx.fillStyle = "rgba(215,225,236,0.35)";
            }
            ctx.fillRect(padLeft + c * cellW, padTop + r * cellH, cellW, cellH);
        }
    }

    ctx.strokeStyle = "rgba(20,54,82,0.18)";
    for (var lineR = 0; lineR <= rows; lineR += 5) {
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop + lineR * cellH);
        ctx.lineTo(padLeft + plotW, padTop + lineR * cellH);
        ctx.stroke();
    }
    for (var lineC = 0; lineC <= cols; lineC += 4) {
        ctx.beginPath();
        ctx.moveTo(padLeft + lineC * cellW, padTop);
        ctx.lineTo(padLeft + lineC * cellW, padTop + plotH);
        ctx.stroke();
    }

    ctx.fillStyle = "#415a72";
    ctx.font = "13px Manrope";
    ctx.fillText("diffY +20", 8, padTop + 10);
    ctx.fillText("diffY 0", 16, padTop + plotH / 2 + 4);
    ctx.fillText("diffY -20", 8, padTop + plotH - 2);
    ctx.fillText("tubeX 0", padLeft, height - 10);
    ctx.fillText("tubeX 28", padLeft + plotW - 62, height - 10);

    if (legend) {
        legend.innerText = "Red: Q(Jump) > Q(Stay), Blue: Q(Stay) > Q(Jump). Color depth = |Qjump - Qstay| (not probability). speedY=" + speedY + ", states=" + Object.keys(Q_table).length;
    }
}

function renderRewardChart(force) {
    var now = Date.now();
    if (!force && now - rewardVizLastRenderMs < 250) {
        return;
    }
    rewardVizLastRenderMs = now;
    var canvas = document.getElementById("reward-canvas");
    var legend = document.getElementById("reward-legend");
    if (!canvas || typeof episodeScoreHistory === "undefined") {
        return;
    }
    var hi = getHiDPICanvasContext(canvas);
    var ctx = hi.ctx;
    var width = hi.width;
    var height = hi.height;
    var pad = { left: 28, right: 10, top: 10, bottom: 26 };
    var plotW = width - pad.left - pad.right;
    var plotH = height - pad.top - pad.bottom;
    var history = episodeScoreHistory.slice(-120);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(20,54,82,0.15)";
    for (var gy = 0; gy <= 4; gy++) {
        var y = pad.top + (plotH * gy / 4);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
        ctx.stroke();
    }

    if (history.length < 2) {
        if (legend) legend.innerText = "Need more episodes to draw reward curve.";
        return;
    }

    var maxScore = Math.max(1, Math.max.apply(null, history));
    var minScore = Math.min.apply(null, history);
    var range = Math.max(1, maxScore - minScore);

    ctx.strokeStyle = "rgba(80,96,116,0.75)";
    ctx.beginPath();
    for (var i = 0; i < history.length; i++) {
        var x = pad.left + (plotW * i / (history.length - 1));
        var yv = (history[i] - minScore) / range;
        var y = pad.top + plotH * (1 - yv);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    var avgWindow = 10;
    ctx.strokeStyle = "rgba(215,53,53,0.95)";
    ctx.beginPath();
    for (var j = 0; j < history.length; j++) {
        var start = Math.max(0, j - avgWindow + 1);
        var sum = 0;
        var count = 0;
        for (var k = start; k <= j; k++) {
            sum += history[k];
            count++;
        }
        var avg = sum / count;
        var xa = pad.left + (plotW * j / (history.length - 1));
        var yva = (avg - minScore) / range;
        var ya = pad.top + plotH * (1 - yva);
        if (j === 0) ctx.moveTo(xa, ya); else ctx.lineTo(xa, ya);
    }
    ctx.stroke();

    ctx.fillStyle = "#415a72";
    ctx.font = "13px Manrope";
    ctx.fillText("Episode index (recent window)", pad.left + 8, height - 8);
    ctx.fillText(String(maxScore), 2, pad.top + 8);
    ctx.fillText(String(minScore), 2, pad.top + plotH);
    ctx.fillText("0", pad.left - 2, height - 8);
    ctx.fillText(String(history.length - 1), pad.left + plotW - 20, height - 8);

    // Inline legend swatches in the chart to avoid ambiguity.
    ctx.strokeStyle = "rgba(80,96,116,0.95)";
    ctx.beginPath();
    ctx.moveTo(pad.left + 6, pad.top + 10);
    ctx.lineTo(pad.left + 28, pad.top + 10);
    ctx.stroke();
    ctx.fillStyle = "#415a72";
    ctx.fillText("Raw score", pad.left + 34, pad.top + 14);

    ctx.strokeStyle = "rgba(215,53,53,0.95)";
    ctx.beginPath();
    ctx.moveTo(pad.left + 120, pad.top + 10);
    ctx.lineTo(pad.left + 142, pad.top + 10);
    ctx.stroke();
    ctx.fillStyle = "#415a72";
    ctx.fillText("MA(10)", pad.left + 148, pad.top + 14);

    if (legend) {
        legend.innerText = "X axis: episode index in recent window. Y axis: score/reward proxy. Gray=raw, Red=moving average (10). Recent episodes=" + history.length;
    }
}
