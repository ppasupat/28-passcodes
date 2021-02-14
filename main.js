$(function () {
  'use strict';

  const SCREEN_WIDTH = 500, SCREEN_HEIGHT = 700;
  const FRAME_RATE = 25;

  // ################################
  // Utilities

  function showScene(name, noFade, callback) {
    if (!noFade) {
      $('#cover-fade').show().removeClass('faded');
      setTimeout(function () {
        $('#cover-fade').addClass('faded');
        if (callback !== void 0) callback();
      }, 50);
    }
    $('.scene').hide();
    $('#scene-' + name).show();
    if (noFade && callback !== void 0) callback();
  }

  function showCover(name, delay, callback) {
    $('#cover-' + name).show();
    setTimeout(function () {
      $('#cover-' + name).hide();
      if (callback !== void 0) callback();
    }, delay);
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

  const PUZZLE_SCREEN = $('#puzzle-screen'),
    ANS_DIVS = $('.answer-letter'),
    KEY_ALPHS = $('.key.alph'), ASCII_A = 65,
    KEY_BKSP = $('#key-bksp'), KEY_BKSP_ID = 26,
    KEY_SUBMIT = $('#key-submit'), KEY_SUBMIT_ID = 27;

  const PUZZLES = [];
  let currentIdx = null;

  function switchToPuzzle(idx) {
    currentIdx = idx;
    PUZZLE_SCREEN.empty();    // Clear memory, again
    clearAnswer();
    PUZZLES[currentIdx].init();
    $('#legend-left').toggleClass('legend-on', PUZZLES[currentIdx].legends[0]);
    $('#legend-right').toggleClass('legend-on', PUZZLES[currentIdx].legends[1]);
    checkKeys();
    showScene('puzzle');
  }

  function winPuzzle() {
    settings.completed[currentIdx] = 1;
    saveSettings();
    setupMenu();
  }

  $('#back-button').click(setupMenu);

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

  function clearAnswer() {
    ANS_DIVS.text('');
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
        showCover('correct', 1000, winPuzzle);
      } else {
        showCover('incorrect', 500);
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

  PUZZLES[0] = {
    init: function () {
      let slides = [], currSlide = 0;
      slides.push(
        $('<div class="fill p0-slide">').appendTo(PUZZLE_SCREEN)
          .append($('<div class=p0-hint id=p0-hint-0>'))
          .append($('<div class=fill>')
            .append($('<h1 class=p0-header>').text('Rule'))
            .append($('<p class=p0-middle>').text('The answer always has'))
            .append($('<p class=p0-large>').text('7 LETTERS'))
            .append($('<p class=p0-small>').text('Type it in and press \u23ce.'))));
      slides.push(
        $('<div class="fill p0-slide">').appendTo(PUZZLE_SCREEN).hide()
          .append($('<div class=p0-hint id=p0-hint-1>'))
          .append($('<div class=fill>')
            .append($('<h1 class=p0-header>').text('Hint 1'))
            .append($('<p class=p0-middle>')
              .append('Puzzles with ')
              .append($('<div class="legend legend-on">'))
              .append(' require'))
            .append($('<p class=p0-large>').text('INTERACTION'))
            .append($('<p class=p0-small>').text('Click/Tap on suspicious objects!'))));
      slides.push(
        $('<div class="fill p0-slide">').appendTo(PUZZLE_SCREEN).hide()
          .append($('<div class=p0-hint id=p0-hint-2>'))
          .append($('<div class=fill>')
            .append($('<h1 class=p0-header>').text('Hint 2'))
            .append($('<p class=p0-middle>')
              .append('Puzzles with ')
              .append($('<div class="legend legend-box legend-on">'))
              .append(' require thinking'))
            .append($('<p class=p0-large>').text('OUTSIDE THE BOX'))
            .append($('<p class=p0-small>')
              .text('... or maybe outside your device!'))));
      $('<div class="btn btn-bottom" id="p0-next">').appendTo(PUZZLE_SCREEN)
        .text('NEXT').click(function () {
          currSlide = (currSlide + 1) % slides.length;
          for (let i = 0; i < slides.length; i++) {
            slides[i].toggle(i == currSlide);
          }
        });
    },
    answer: 'BICYCLE',
    legends: [true, false],
  };

  PUZZLES[1] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/pigpen.jpg")'));
    },
    answer: 'JACUZZI',
    legends: [false, false],
  };

  PUZZLES[2] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/middle.jpg")'));
    },
    answer: 'MALLEUS',
    legends: [false, false],
  };

  const P3_GRID = [
    [6, 8, 2, 4, 4, 10, 3, 0, 11, 8, 11, 7],
    [9, 11, 3, 6, 2, 6, 1, 11, 11, 0, 5, 8],
    [8, 9, 1, 2, 1, 10, 0, 0, 7, 1, 7, 5],
    [11, 10, 5, 8, 7, 8, 0, 10, 6, 0, 11, 2],
    [0, 3, 11, 3, 7, 2, 1, 1, 6, 8, 9, 6],
    [1, 10, 11, 3, 8, 5, 10, 6, 9, 5, 3, 7],
    [5, 11, 4, 9, 3, 0, 8, 0, 10, 4, 6, 0],
    [4, 4, 4, 9, 11, 8, 11, 5, 8, 4, 9, 5],
  ];

  PUZZLES[3] = {
    init: function () {
      let petshop = $('<div class=fill>').appendTo(PUZZLE_SCREEN);
      $('<div class=p3-title>').appendTo(petshop).text('PET SHOP');
      P3_GRID.forEach(function (gridRow) {
        let row = $('<div class=p3-row>').appendTo(petshop);
        gridRow.forEach(function (cell) {
          $('<div class=p3-pet>').addClass('p3-a' + cell).appendTo(row);
        });
      });
      petshop.on('click', '.p3-pet', function (e) {
        let cell = /p3-a\d+/.exec(e.target.className);
        if (cell === null) {
          alert('Cell ID not found.');
          return;
        }
        petshop.find('.' + cell).toggleClass('p3-on');
      });
    },
    answer: 'PENGUIN',
    legends: [true, false],
  };

  PUZZLES[4] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/mystery-animal.jpg")'));
    },
    answer: 'AXOLOTL',
    legends: [false, false],
  };

  // Code modified from https://github.com/ppasupat/pairs/
  PUZZLES[5] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/mystery-location.jpg")'));
      let board = $('<div id=p5-board class="fill centerize">')
        .appendTo(PUZZLE_SCREEN);
      let cards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      // Shuffle
      for (let i = cards.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        if (j != i) {
          let tmp = cards[i];
          cards[i] = cards[j];
          cards[j] = tmp;
        }
      }
      // Put on board
      let rowLimit = 0, rowDiv;
      for (let i = 0; i < cards.length; i++) {
        if (i === rowLimit) {
          rowDiv = $('<div class=p5-row>').appendTo(board);
          rowLimit += 5;
        }
        let name = cards[i] < 12 ? cards[i] >> 1 : cards[i]; 
        let cardFlipper = $('<div class=p5-card-flipper>').appendTo(rowDiv)
          .data({index: i, name: name});
        $('<div class="p5-card p5-card-front centerize">').appendTo(cardFlipper)
          //.text(cards[i]);
          .append($('<div class=p5-emoji>')
            .css('background-position-x', '' + (-72 * cards[i]) + 'px'));
        $('<div class="p5-card p5-card-back">').appendTo(cardFlipper);
      }
      // Add event listener
      let open1 = null, open2 = null;
      board.on("click", ".p5-card-flipper", function (e) {
        let thisCard = $(this);
        // Don't open removed or opened card
        if (
          thisCard.hasClass('removed') ||
          (open1 !== null && open1.data('index') == thisCard.data('index')) ||
          (open2 !== null && open2.data('index') == thisCard.data('index'))
        ) {
          return;
        }
        // Flip back the old cards if needed
        if (open1 !== null && open2 !== null) {
          if (!open1.hasClass('removed')) open1.removeClass('flip');
          if (!open2.hasClass('removed')) open2.removeClass('flip');
          open1 = null;
          open2 = null;
        }
        thisCard.addClass('flip');
        if (open1 === null) {
          open1 = thisCard;
        } else {
          open2 = thisCard;
          // If it's the 2nd card, check for match
          if (open1.data('name') == open2.data('name')) {
            open1.addClass('removed');
            open2.addClass('removed');
          }
        }
      });
    },
    answer: 'AIRPORT',
    legends: [true, false],
  };

  PUZZLES[7] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class="fill centerize p7-screen">').text('(sorry, no hint)'));
    },
    checkKeys: function () {
      let answer = getAnswer(),
        goldAnswer = this.answer,
        isEmpty = (answer === '_______'),
        isFilled = (answer.search('_') === -1);
      KEY_BKSP.toggleClass('xxx', isEmpty);
      KEY_SUBMIT.toggleClass('xxx', !isFilled);
      KEY_ALPHS.each(function () {
        let x = $(this).text();
        $(this).toggleClass('xxx',
          (goldAnswer.search(x) === -1 || answer.search(x) !== -1));
      });
      return true;
    },
    answer: 'RAINBOW',
    legends: [false, true],
  };

  PUZZLES[8] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/box.jpg")'));
    },
    answer: 'SOYBEAN',
    legends: [false, true],
  };

  PUZZLES[9] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/triple.jpg")'));
    },
    answer: 'AUTOPSY',
    legends: [false, true],
  };

  PUZZLES[11] = {
    init: function () {
      let bg = $('<div class=fill>').appendTo(PUZZLE_SCREEN);
      $('<div class="p11-slice p11-top">').appendTo(bg);
      $('<div class="p11-slice p11-mid p11-a1">').appendTo(bg);
      $('<div class="p11-slice p11-btm p11-a2">').appendTo(bg);
      bg.on('click', '.p11-slice', function () {
        let that = $(this);
        if (that.hasClass('p11-a1')) {
          that.removeClass('p11-a1').addClass('p11-a2');
        } else if (that.hasClass('p11-a2')) {
          that.removeClass('p11-a2');
        } else {
          that.addClass('p11-a1');
        }
      });
    },
    answer: 'MAGICAL',
    legends: [true, true],
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
    'img/emoji/legends.png',
    'img/emoji/1f6b2-parts.png',
    'img/pigpen.jpg',
    'img/middle.jpg',
    'img/emoji/pets.png',
    'img/mystery-animal.jpg',
    'img/mystery-location.jpg',
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

  let images = [];
  imageList.forEach(function (x) {
    let img = new Image();
    img.onload = decrementPreload;
    img.src = x;
    images.push(img);
  });
  showScene('preload', true);

});
