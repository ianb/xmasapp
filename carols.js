window.addEventListener("load", function () {
  var songs = [];
  var songsByName = {};
  var songEls = document.querySelectorAll(".song");
  for (var i=0; i<songEls.length; i++) {
    var el = songEls[i];
    var name = el.querySelector("h1").textContent;
    if (! name) {
      continue;
    }
    var song = {
      name: name,
      el: el
    };
    var control = document.createElement("div");
    control.innerHTML = "back";
    control.className = "back";
    el.insertBefore(control, el.childNodes[0]);
    control.addEventListener("click", function () {
      back();
    }, false);
    var about = el.querySelector(".about");
    if (about) {
      about.setAttribute("target", "_blank");
    }
    songs.push(song);
    songsByName[song.name] = song;
  }
  songs.sort(function (a, b) {
    return a.name > b.name ? 1 : -1;
  });
  var songList = document.getElementById("song-list");
  songs.forEach(function (song) {
    var div = document.createElement("div");
    div.className = "song-select";
    div.appendChild(document.createTextNode(song.name));
    div.addEventListener("click", function () {
      selectSong(song);
    }, false);
    songList.appendChild(div);
  });

  function back() {
    songs.forEach(function (song) {
      song.el.classList.add("hidden");
    });
    document.getElementById("controls").style.display = "";
    location.hash = "";
  }

  function selectSong(song) {
    document.getElementById("controls").style.display = "none";
    song.el.classList.remove("hidden");
    location.hash = "#" + encodeURIComponent(song.name);
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

}, false);
