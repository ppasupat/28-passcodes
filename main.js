$(function () {
  "use strict";

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
      $('#cover-fade').addClass('faded');
    }
  }

  $('#cover-fade').on('transitionend', function () {
    $(this).removeClass('faded').hide();
  });

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
      alert("ERROR: " + e.message);
    }
  }

  function resetSettings() {
    if (!window.confirm("Reset progress?")) return;
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
    showScene('puzzle');
  }

  // ################################
  // Actual puzzles

  PUZZLES[4] = {
    init: function () {

    },
  };

  // ################################
  // Menu

  function setupMenu() {
    $('.poster').each(function (i, x) {
      let idx = +$(x).data('idx');
      $(x).toggleClass('completed', !!settings.completed[idx]);
    });
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
      showScene('menu');
    } else {
      $('#pane-loading').text('Loading resources (' + numResourcesLeft + ' left)');
    }
  }

  let images = [];
  imageList.forEach(function (x) {
    let img = new Image();
    img.onload = decrementPreload;
    img.src = x;
    images.push(img);
  });
  showScene('preload', true);

});
