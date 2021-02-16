$(function () {
  'use strict';

  const SCREEN_WIDTH = 500, SCREEN_HEIGHT = 700;
  const FRAME_RATE = 8;

  // ################################
  // Utilities

  function shuffle(stuff) {
    stuff = stuff.slice();
    for (let i = stuff.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      if (j != i) {
        let tmp = stuff[i];
        stuff[i] = stuff[j];
        stuff[j] = tmp;
      }
    }
    return stuff;
  }

  function gup(name) {
    let regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    let results = regex.exec(window.location.href);
    return results === null ? "" : decodeURIComponent(results[1]);
  }

  // ################################
  // Scenes

  function showScene(name, callback) {
    $('.scene').hide();
    $('#scene-' + name).show();
    if (callback !== void 0) callback();
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
      {completed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]});
  let settings = {};

  function loadSettings() {
    let settings_raw = localStorage.getItem(APP_NAME);
    if (settings_raw === null) {
      settings_raw = DEFAULT_SETTINGS;
    }
    settings = JSON.parse(settings_raw);
    // Handle the hidden level
    settings.completed[13] = 0;
    let sum = 0;
    for (let i = 0; i < 13; i++) if (settings.completed[i] > 0) sum++;
    if (sum === 13) $('.poster[data-idx="13"]').show();
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
  // Audio

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  let songBuffer = null;
  let audioSource = null;

  function playSound(callback) {
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = songBuffer;
    audioSource.connect(audioCtx.destination);
    audioSource.onended = function () {
      audioSource = null;
      if (callback !== void 0) callback();
    };
    audioSource.start();
  }

  function stopSound() {
    if (audioSource !== null) audioSource.stop();
  }

  // ################################
  // Timer

  // onUpdate: fn(timerId, percentTimeLeft)
  //   Called every interval. Return true to keep the timer alive.
  // onTimeup: fn()
  //   Called once when the time left is 0.
  function startTimer(amountMs, onUpdate, onTimeup) {
    let timerStartTime = Date.now(), timerAmount = amountMs, timerId;
    let updateTimer = function () {
      let remaining = timerAmount - (Date.now() - timerStartTime);
      //console.log(timerId, remaining);
      if (!onUpdate(timerId, remaining / timerAmount)) {
        stopTimer(timerId);   // Timer is no longer needed.
        return;
      }
      if (remaining <= 0) {
        stopTimer(timerId);
        onTimeup();
      }
    };
    timerId = window.setInterval(updateTimer, 1000. / FRAME_RATE);
    return timerId;
  }
  
  function stopTimer(timerId) {
    //console.log('STOP', timerId);
    window.clearInterval(timerId);
  }

  // ################################
  // Puzzle utils

  const PUZZLE_SCREEN = $('#puzzle-screen'),
    ANS_DIVS = $('.answer-letter'),
    KEY_ALPHS = $('.key.alph'),
    KEY_BKSP = $('#key-bksp'), KEY_BKSP_ID = 'key-bksp',
    KEY_SUBMIT = $('#key-submit'), KEY_SUBMIT_ID = 'key-submit';

  const PUZZLES = [];
  let currentIdx = null;

  function switchToPuzzle(idx) {
    currentIdx = idx;
    clearPuzzleScreen();
    clearAnswer();
    resetKeys();
    PUZZLES[currentIdx].init();
    $('#legend-left').toggleClass('legend-on', PUZZLES[currentIdx].legends[0]);
    $('#legend-right').toggleClass('legend-on', PUZZLES[currentIdx].legends[1]);
    showHintButton();
    checkKeys();
    showScene('puzzle');
  }

  function clearPuzzleScreen() {
    PUZZLE_SCREEN.empty();
    stopSound();
  }

  const HINT_THRESHOLD = -3;

  function showHintButton() {
    $('#hint-button').toggle(
      settings.completed[currentIdx] <= HINT_THRESHOLD
      && PUZZLES[currentIdx].hint !== void 0
    );
  }

  $('#hint-button').click(function () {
    let hint = PUZZLES[currentIdx].hint;
    if (typeof hint === 'string' || hint instanceof String) {
      alert(hint);
    } else {    // Assume it's a callable
      hint();
    }
  });

  function failPuzzle(callback) {
    showCover('incorrect', 500, function () {
      if (callback !== void 0) callback();
      settings.completed[currentIdx]--;
      saveSettings();
      showHintButton();
    });
  }

  function winPuzzle() {
    showCover('correct', 1000, function () {
      settings.completed[currentIdx] = 1;
      saveSettings();
      setupMenu();
    });
  }

  $('#back-button').click(setupMenu);

  // Answer-related stuff

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

  // Key-related stuff

  const ENGLISH_KEYS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G',
    'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X', 'Y', 'Z',
  ];

  function setKeys(keyArray) {
    KEY_ALPHS.each(function (i) {
      $(this).text(keyArray[i]);
    });
  }

  function resetKeys() {
    setKeys(ENGLISH_KEYS);
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

  // Handler when clicking on a non-disabled key
  function onKey(key) {
    if (PUZZLES[currentIdx].onKey !== void 0) {
      if (PUZZLES[currentIdx].onKey(key)) return;
    }
    let keyId = key.attr('id'),
      answer = getAnswer(), firstBlankPos = getFirstBlankPos(answer);
    if (keyId === KEY_SUBMIT_ID) {
      if (answer === PUZZLES[currentIdx].answer) {
        winPuzzle();
      } else {
        failPuzzle();
      }
    } else if (keyId === KEY_BKSP_ID) {
      setAnswer(firstBlankPos - 1, '_');
    } else {  // Alph
      setAnswer(firstBlankPos, key.text());
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
            .append($('<p class=p0-small>').text('Type it in and press OK.'))));
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
    hint: "Press NEXT repeatedly and look at the background!",
  };

  PUZZLES[1] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/pigpen.jpg")'));
    },
    answer: 'JACUZZI',
    legends: [false, false],
    hint: function () {
      alert('Search Google for "secret code"!');
      window.open("https://www.google.com/search?tbm=isch&q=secret+code");
    },
  };

  PUZZLES[2] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/middle.jpg")'));
    },
    answer: 'MALLEUS',
    legends: [false, false],
    hint: "I don't know, I'm not an ENT physician.",
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
    hint: "If you keep only the animals, another 7-letter animal will appear.",
  };

  PUZZLES[4] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/mystery-animal.jpg")'));
    },
    answer: 'AXOLOTL',
    legends: [false, false],
    hint: function () {
      alert('Search Google for "that cute sea animal"!');
      window.open("https://www.google.com/search?tbm=isch&q=that+cute+sea+animal");
    },
  };

  // Code modified from https://github.com/ppasupat/pairs/
  PUZZLES[5] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/mystery-location.jpg")'));
      let board = $('<div id=p5-board class="fill centerize">')
        .appendTo(PUZZLE_SCREEN);
      let cards = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
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
    hint: "Not all cards will match, but you only need to answer the 7-letter location name.",
  };

  PUZZLES[6] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/wall.jpg")'));
      $('<div id=p6-play class=btn>').text('PLAY').appendTo(PUZZLE_SCREEN)
        .click(function () {
          if ($(this).hasClass('xxx')) return;
          playSound(function () {
            $('#p6-play').removeClass('xxx');
          });
          $('#p6-play').addClass('xxx');
        });
      $('<div id=p6-question class=centerize>').appendTo(PUZZLE_SCREEN)
        .text("What's the singer's last name?");
    },
    onKey: function (key) {
      // Alternative answers + Turn off the music
      if (key.attr('id') === KEY_SUBMIT_ID) {
        let answer = getAnswer();
        if (answer === 'TAPUSAP' || answer === 'PATSUPA') {
          winPuzzle();
          stopSound();
          return true;
        }
      }
      return false;
    },
    answer: null,   // Already checked in onKey above
    legends: [true, false],
    hint: "Make sure the audio is on! Lyrics: YOU TO DAYBIRTH PYHAP",
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
    legends: [false, false],
    hint: function () {
      alert('Search Google for "anagram"!');
      window.open("https://www.google.com/search?q=anagram");
    },
  };

  PUZZLES[8] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/box.jpg")'));
    },
    answer: 'SOYBEAN',
    legends: [false, true],
    hint: 'Look around the apartment!',
  };

  PUZZLES[9] = {
    init: function () {
      PUZZLE_SCREEN.append(
        $('<div class=fill>')
        .css('background', 'url("img/triple.jpg")'));
    },
    answer: 'AUTOPSY',
    legends: [false, true],
    hint: 'Look around the apartment!',
  };

  PUZZLES[10] = {
    init: function () {
      let bg = $('<div class=fill>').appendTo(PUZZLE_SCREEN);
      $('<div class="p10-slice p10-top">').appendTo(bg);
      $('<div class="p10-slice p10-mid p10-a1">').appendTo(bg);
      $('<div class="p10-slice p10-btm p10-a2">').appendTo(bg);
      bg.on('click', '.p10-slice', function () {
        let that = $(this);
        if (that.hasClass('p10-a1')) {
          that.removeClass('p10-a1').addClass('p10-a2');
        } else if (that.hasClass('p10-a2')) {
          that.removeClass('p10-a2');
        } else {
          that.addClass('p10-a1');
        }
      });
    },
    answer: 'MAGICAL',
    legends: [true, true],
    hint: 'Look around the apartment!',
  };

  const P11_TIME_LIMIT = 7000, P11_MAGMA_TOP = 100, P11_MAGMA_HEIGHT = 220;

  PUZZLES[11] = {
    init: function () {
      let bg = $('<div id=p11-bg class=fill>').appendTo(PUZZLE_SCREEN);
      $('<div id=p11-magma>').appendTo(bg);
      $('<div id=p11-volcano>').appendTo(bg);
      $('<div id=p11-lava>').appendTo(bg);
      $('<div id=p11-prompt>').appendTo(bg)
        .append('The answer is <strong>VOLCANO</strong>');
      this.reset();
    },
    timerId: null,
    reset: function () {
      let that = this;
      setKeys(shuffle(ENGLISH_KEYS)); 
      clearAnswer();
      checkKeys();
      $('#p11-magma').css('top', '' + (P11_MAGMA_TOP + P11_MAGMA_HEIGHT) + 'px');
      $('#p11-lava').hide();
      this.timerId = startTimer(
        P11_TIME_LIMIT,
        function (timerId, percentTimeLeft) {
          if (timerId !== that.timerId
            || !$('#p11-magma').length
            || $('#p11-magma').hasClass('p11-won')) return false;
          let topPx = P11_MAGMA_TOP + P11_MAGMA_HEIGHT * percentTimeLeft;
          $('#p11-magma').css('top', '' + topPx + 'px');
          return true;
        }, function () {
          $('#p11-lava').show();
          failPuzzle(that.reset.bind(that));
        });
    },
    checkKeys: function () {
      // Disable the submit key. Submit on the last letter.
      // This is to prevent the "Incorrect screen" when pressing submit.
      let answer = getAnswer(),
        isEmpty = (answer === '_______'),
        isFilled = (answer.search('_') === -1);
      KEY_BKSP.toggleClass('xxx', isEmpty);
      KEY_ALPHS.toggleClass('xxx', isFilled);
      KEY_SUBMIT.addClass('xxx');
      return true;
    },
    onKey: function (key) {
      let keyId = key.attr('id'),
        answer = getAnswer(), firstBlankPos = getFirstBlankPos(answer);
      if (keyId === KEY_SUBMIT_ID) {
        alert('Invalid key!');
      } else if (keyId === KEY_BKSP_ID) {
        setAnswer(firstBlankPos - 1, '_');
      } else {  // Alph
        setAnswer(firstBlankPos, key.text());
        if (getAnswer() === this.answer) {
          $('#p11-magma').addClass('p11-won');
          winPuzzle();
        }
      }
      return true;
    },
    answer: 'VOLCANO',
    legends: [false, false],
  };

  const P12_LIVES = 9;
  const P12_WORDS = [
    'AWKWARD', 'DWARVES', 'JACKPOT', 'JUKEBOX',
    'KEYHOLE', 'MYSTERY', 'QUIZZES', 'WHISKEY',
  ];

  PUZZLES[12] = {
    init: function () {
      let bg = $('<div id=p12-bg class=fill>').appendTo(PUZZLE_SCREEN);
      bg.append('<div id=p12-hangman class=centerize>');
      this.reset();
    },
    answer: null,
    used: null,
    reset: function () {
      let i = Math.floor(Math.random() * P12_WORDS.length);
      this.answer = P12_WORDS[i];
      this.used = [];
      $('#p12-hangman').css('background-position-x', 0);
      // Reset the interface
      clearAnswer();
      checkKeys();
    },
    checkKeys: function () {
      let answer = getAnswer(),
        used = this.used,
        isEmpty = (answer === '_______'),
        isFilled = (answer.search('_') === -1);
      KEY_BKSP.addClass('xxx');
      KEY_SUBMIT.addClass('xxx');
      KEY_ALPHS.each(function () {
        let x = $(this).text();
        $(this).toggleClass('xxx',
          (used.indexOf(x) !== -1 || answer.search(x) !== -1));
      });
      return true;
    },
    onKey: function (key) {
      let that = this, x = key.text(), found = false;
      for (let i = 0; i < 7; i++) {
        if (this.answer.charAt(i) === x) {
          setAnswer(i, x);
          found = true;
        }
      }
      if (!found) {
        this.used.push(x);
        let livesLeft = P12_LIVES - this.used.length;
        $('#p12-hangman').css(
          'background-position-x', ((livesLeft + 1) * 300) + 'px');
        if (this.used.length === P12_LIVES) {
          failPuzzle(that.reset.bind(that));
        }
      }
      if (getAnswer().search('_') === -1) {
        winPuzzle();
      }
      return true;
    },
    legends: [false, false],
    hint: "There are only 8 possible words. Try remembering the vowel patterns.",
  };

  const THAI_KEYS = [
    'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช',
    'ด', 'ต', 'ถ', 'ท', 'น', 'บ', 'ป',
    'ผ', 'ฝ', 'พ', 'ฟ', 'ม', 'ย', 'ร',
    'ล', 'ว', 'ส', 'ห', 'อ',
  ];
  const P13_QUOTES = [
    'พวกเราก็ไม่พอใจนะครับ<br>สำหรับ<br>บุคลากรทางการแพทย์ที่<br><strong>ไม่เฝ้าระวังตัวเอง</strong>',
    'คนที่<br><strong>ไม่ใช่แพทย์</strong><br>ไม่ใช่ผู้เชี่ยวชาญ<br> ... <br>ขอให้<br><strong>สงบปากสงบคำ</strong><br>เพราะไม่เกิดประโยชน์',
    'เชื้อโควิด<br><strong>กระจอกงอกง่อย</strong>',
    'เห็นหน้าคนโพสต์<br>เลยเข้าใจแล้วว่า<br><strong>หมาไม่เข้าใจคนอ่ะ</strong>',
    'ของขวัญปีใหม่ปีนี้<br>ถือเป็นครั้งแรกที่คนไทย<br>ทุกครอบครัว จะได้ทราบ<br><strong>ชื่อ เบอร์โทร</strong><br>และช่องทางให้คำปรึกษา<br>จากหมอประจำตัว<br><strong>3 คน</strong>',
    '[ให้คะแนนตัวเอง]<br><strong>10 เต็ม 10 ครับ</strong>',
  ];
  const P13_INTERVAL = 3000;

  PUZZLES[13] = {
    init: function () {
      setKeys(THAI_KEYS); 
      let timestamp = Date.now();
      let bg = $('<div id=p13-bg class=fill>').appendTo(PUZZLE_SCREEN);
      $('<div id=p13-left>').appendTo(bg);
      $('<div id=p13-right class=centerize>').appendTo(bg)
        .append($('<div id=p13-quote>').data('ts', timestamp));
      let quoteId = -1;
      let updateQuote = function () {
        quoteId++;
        if (quoteId >= P13_QUOTES.length) quoteId = 0;
        if ($('#p13-quote').length && $('#p13-quote').data('ts') == timestamp) {
          $('#p13-quote').html(P13_QUOTES[quoteId]);
          setTimeout(updateQuote, P13_INTERVAL);
        }
      };
      updateQuote();
    },
    onKey: function (key) {
      // Alternative answers
      if (key.attr('id') === KEY_SUBMIT_ID) {
        let answer = getAnswer();
        let sum = 0;
        for (let i = 0; i < 7; i++) {
          sum += (answer.charCodeAt(i) - 3585) * Math.pow(31, i);
        }
        if (sum % (+gup('passcode')) === 273794) {
          winPuzzle();
          return true;
        }
      }
      return false;
    },
    answer: null,   // Already checked in onKey above
    legends: [false, false],
    hint: 'Note: This bonus puzzle is impossible to win without a correct URL passcode.',
  };

  // ################################
  // Menu

  function setupMenu() {
    clearPuzzleScreen();
    currentIdx = null;
    let numCompleted = 0;
    $('.poster').each(function (i, x) {
      let idx = +$(x).data('idx');
      if (settings.completed[idx] > 0) {
        $(x).addClass('completed');
        numCompleted++;
      } else {
        $(x).removeClass('completed');
      }
    });
    if (numCompleted >= 13) {
      // Show the victory screen
      setTimeout(function () {
        $('#scene-menu').addClass('victory');
      }, 500);
    }
    showScene('menu');
  }

  $('#reset-button').click(resetSettings);
  $('.poster').click(function (e) {
    let x = $(this), idx = +x.data('idx');
    if (settings.completed[idx] > 0) return;
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
    'img/boom.png',
    'img/box.jpg',
    'img/emoji/1f6b2-parts.png',
    'img/emoji/legends.png',
    'img/emoji/pairs.png',
    'img/emoji/pets.png',
    'img/hangman.png',
    'img/lava.png',
    'img/menu.jpg',
    'img/middle.jpg',
    'img/mystery-animal.jpg',
    'img/mystery-location.jpg',
    'img/mystery-person.jpg',
    'img/paper_3_cyan.png',
    'img/pigpen.jpg',
    'img/slices-v2.jpg',
    'img/triple.jpg',
    'img/wall.jpg',
  ];
  let numResourcesLeft = imageList.length;

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
  showScene('preload');

  let audioRequest = new XMLHttpRequest();
  audioRequest.open("GET", 'img/hbd-sliced.mp3', true);
  audioRequest.responseType = "arraybuffer";
  audioRequest.onload = function () {
    audioCtx.decodeAudioData(audioRequest.response, function (buffer) {
      songBuffer = buffer;
      decrementPreload();
    });
  };
  audioRequest.send();
  numResourcesLeft++;

  $('#pane-loading').text('Loading resources (' + numResourcesLeft + ' left)');

});
