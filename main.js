$(function () {
  'use strict';

  const SCREEN_WIDTH = 500, SCREEN_HEIGHT = 700;
  const FRAME_RATE = 25;

  // ################################
  // Utilities

  function showScene(name, noFade) {
    if (!noFade) {
      $('#cover-fade').show().removeClass('faded');
    }
    $('.scene').hide();
    $('#scene-' + name).show();
    if (!noFade) {
      setTimeout(function () {
        $('#cover-fade').addClass('faded');
      }, 5);
    }
  }

  // ################################
  // Persistence

  const APP_NAME = 'secret-code-28',
    DEFAULT_SETTINGS = JSON.stringify(
      {completed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]});
  let settings = {};

  function loadSettings() {
    let settings_raw = localStorage.getItem(APP_NAME);
    if (settings_raw === null) {
      settings_raw = DEFAULT_SETTINGS;
    }
    settings = JSON.parse(settings_raw);
    console.log(settings);
  }

  function saveSettings() {
    try {
      localStorage.setItem(APP_NAME, JSON.stringify(settings));
    } catch (e) {
      alert('ERROR: ' + e.message);
    }
  }

  function resetSettings() {
    if (!window.confirm('Reset progress?')) return;
    settings = JSON.parse(DEFAULT_SETTINGS);
    saveSettings();
    window.location.reload();
  }

  loadSettings();

  // ################################
  // Puzzle utils

  const PUZZLES = [];
  let currentIdx = null;

  function switchToPuzzle(idx) {
    currentIdx = idx;
    PUZZLES[currentIdx].init();
    checkKeys();
    showScene('puzzle');
  }

  function winPuzzle() {
    settings.completed[currentIdx] = 1;
    saveSettings();
    setupMenu();
  }

  $('#back-button').click(setupMenu);

  const PUZZLE_SCREEN = $('#puzzle-screen'),
    ANS_DIVS = $('.answer-letter'),
    KEY_ALPHS = $('.key.alph'), ASCII_A = 65,
    KEY_BKSP = $('#key-bksp'), KEY_BKSP_ID = 26,
    KEY_SUBMIT = $('#key-submit'), KEY_SUBMIT_ID = 27;

  function getAnswer() {
    let answer = '';
    ANS_DIVS.each(function () {
      answer += $(this).text() || '_';
    });
    return answer;
  }

  function getFirstBlankPos(answer) {
    for (let i = 0; i < answer.length; i++) {
      if (answer[i] === '_') return i;
    }
    return answer.length;
  }

  function setAnswer(pos, value) {
    if (pos < 0 || pos >= 7 || value.length > 1) {
      alert('ERROR: invalid setAnswer(' + pos + ', "' + value + '")');
      return;
    }
    $(ANS_DIVS.get(pos)).text(value === '_' ? '' : value);
  }

  // Set the 'xxx' class on disabled keys
  function checkKeys() {
    if (PUZZLES[currentIdx].checkKeys !== void 0) {
      if (PUZZLES[currentIdx].checkKeys()) return;
    }
    let answer = getAnswer(),
      isEmpty = (answer === '_______'),
      isFilled = (answer.search('_') === -1);
    KEY_BKSP.toggleClass('xxx', isEmpty);
    KEY_ALPHS.toggleClass('xxx', isFilled);
    KEY_SUBMIT.toggleClass('xxx', !isFilled);
  }

  function onKey(key) {
    if (PUZZLES[currentIdx].onKey !== void 0) {
      if (PUZZLES[currentIdx].onKey(key)) return;
    }
    let keyId = key.index(), answer = getAnswer(),
      firstBlankPos = getFirstBlankPos(answer);
    if (keyId === KEY_SUBMIT_ID) {
      if (answer === PUZZLES[currentIdx].answer) {
        // TODO: Replace with something less intrusive
        alert('Correct!');
        winPuzzle();
      } else {
        alert('Incorrect!');
      }
    } else if (keyId === KEY_BKSP_ID) {
      setAnswer(firstBlankPos - 1, '_');
    } else {  // Alph
      setAnswer(firstBlankPos, String.fromCharCode(ASCII_A + keyId));
    }
  }

  $('.key').click(function (e) { 
    if ($(this).hasClass('xxx')) return;
    onKey($(this));
    checkKeys();
  });

  // ################################
  // Actual puzzles

  PUZZLES[4] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill-screen>')
        .css('background', 'url("img/mystery-animal.png")'));
    },
    answer: 'AXOLOTL',
  };

  // ################################
  // Menu

  function setupMenu() {
    PUZZLE_SCREEN.empty();    // Clear memory
    $('.poster').each(function (i, x) {
      let idx = +$(x).data('idx');
      $(x).toggleClass('completed', !!settings.completed[idx]);
    });
    showScene('menu');
  }

  $('#reset-button').click(resetSettings);
  $('.poster').click(function (e) {
    let x = $(this), idx = +x.data('idx');
    if (!!settings.completed[idx]) return;
    if (PUZZLES[idx] === void 0) {
      alert('Puzzle not here yet!');
    } else {
      switchToPuzzle(idx);
    }
  });

  function onWinPuzzle() {

  }

  // ################################
  // Preloading and screen resizing

  function resizeScreen() {
    let ratio = Math.min(
      1.0,
      window.innerWidth / SCREEN_WIDTH,
      (window.innerHeight - 25) / SCREEN_HEIGHT,
    );
    $('#game-wrapper').css({
      'width': (SCREEN_WIDTH * ratio) + 'px',
      'height': (SCREEN_HEIGHT * ratio) + 'px',
    });
    $('#game').css('transform', 'scale(' + ratio + ')');
  }

  resizeScreen();
  $(window).resize(resizeScreen);

  const imageList = [
    'img/emoji/heart.png',
  ];
  let numResourcesLeft = imageList.length;
  $('#pane-loading').text('Loading resources (' + numResourcesLeft + ' left)');

  function decrementPreload () {
    numResourcesLeft--;
    if (numResourcesLeft === 0) {
      setupMenu();
    } else {
      $('#pane-loading').text('Loading resources (' + numResourcesLeft + ' left)');
    }
  }

  let images = [
    'img/mystery-animal.png',
  ];
  imageList.forEach(function (x) {
    let img = new Image();
    img.onload = decrementPreload;
    img.src = x;
    images.push(img);
  });
  showScene('preload', true);

});
