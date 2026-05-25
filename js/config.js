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
        speedSlider.value = 100 - HUMAN_DIFFICULTY_DELAYS[humanDifficulty];
        speedSlider.disabled = true;
        if (difficultySelect) {
            difficultySelect.disabled = false;
            difficultySelect.value = humanDifficulty;
        }
        applyGameDelay(HUMAN_DIFFICULTY_DELAYS[humanDifficulty]);
    }
}
