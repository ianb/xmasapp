$(function () {
  var songs = [];
  var songsByName = {};
  $(".song").each(function () {
    var el = $(this);
    el.name = el.find("h1").text();
    if (! el.name) {
      return;
    }
    console.log("found", el.name);
    var control = $('<div class="back">back</div>');
    el.prepend(control);
    el.find(".about").attr("target", "_blank");
    control.click(function () {
      back();
    });
    songs.push(el);
    songsByName[el.name] = el;
  });
  songs.sort(function (a, b) {
    return a.name > b.name ? 1 : -1;
  });
  songs.forEach(function (el) {
    var div = $('<div class="song-select"></div>').text(el.name);
    div.click(function () {
      selectSong(el);
    });
    $("#song-list").append(div);
  });

  function back() {
    $(".song").addClass("hidden");
    $("#controls").show();
    location.hash = "";
  }

  function selectSong(el) {
    $("#controls").hide();
    el.removeClass("hidden");
    location.hash = "#" + encodeURIComponent(el.name);
  }

  function hashChange() {
    var hash = location.hash;
    if ((! hash) || hash == "#") {
      back();
      return;
    }
    hash = decodeURIComponent(hash.substr(1));
    var song = songsByName[hash];
    if (song) {
      selectSong(song);
    }
  }

  window.addEventListener("hashchange", hashChange, false);
  hashChange();

});
