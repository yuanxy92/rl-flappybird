/**
 * The script just contains handlers for making the game configurable. Nothing of much interest here ^__^
 * 
 * Author @nellex
 */

var isEnvironmentStatic = true;
var displayTarget = false;
var HUMAN_MODE_SPEED = 40;

function applyGameSpeed(speedValue) {
    clearInterval(eventLoop);
    eventLoop = setInterval(loop, 100 - speedValue);
}

function gameSpeedChange(curSpeed) {
    if (!isAutoPlay) {
        var humanSpeedSlider = document.getElementById("tel1");
        if (humanSpeedSlider) {
            humanSpeedSlider.value = HUMAN_MODE_SPEED;
        }
        return;
    }
    applyGameSpeed(parseInt(curSpeed, 10));
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
    if (!speedSlider) {
        return;
    }

    if (isAutoPlay) {
        speedSlider.disabled = false;
        applyGameSpeed(parseInt(speedSlider.value, 10));
    } else {
        speedSlider.value = HUMAN_MODE_SPEED;
        speedSlider.disabled = true;
        applyGameSpeed(HUMAN_MODE_SPEED);
    }
}
