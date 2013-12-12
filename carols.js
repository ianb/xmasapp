function charForFavorite(faved) {
  return faved ? "\u2605" : "\u2606";
}

function getFavorite(name) {
  return !! localStorage.getItem("favorite." + name);
}

function setFavorite(name, faved) {
  if (faved) {
    localStorage.setItem("favorite." + name, "true");
  } else {
    localStorage.removeItem("favorite." + name);
  }
}

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
    song.favorite = getFavorite(song.name);
    var control = document.createElement("div");
    control.innerHTML = "back";
    control.className = "back";
    el.insertBefore(control, el.childNodes[0]);
    control.addEventListener("click", function () {
      back();
    }, false);
    var favorite = document.createElement("div");
    favorite.setAttribute("data-name", song.name);
    favorite.innerHTML = charForFavorite(song.favorite);
    favorite.className = "favorite";
    el.insertBefore(favorite, el.childNodes[0]);
    favorite.addEventListener("click", function (event) {
      var name = event.target.getAttribute("data-name");
      var song = songsByName[name];
      song.favorite = ! song.favorite;
      setFavorite(song.name, song.favorite);
      event.target.innerHTML = charForFavorite(song.favorite);
      refreshList();
    });
    console.log("ok", favorite, favorite.parentNode);
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
  var favoriteList = document.getElementById("favorite-list");
  var songsDone = false;

  function refreshList() {
    favoriteList.innerHTML = "";
    var page = 2;
    songs.forEach(function (song) {
      var div = document.createElement("div");
      div.className = "song-select";
      var number = document.createElement('span');
      number.className = 'song-number';
      number.appendChild(document.createTextNode(page));
      div.appendChild(document.createTextNode(song.name));
      div.addEventListener("click", function () {
        selectSong(song);
      }, false);
      div.appendChild(number);
      if (! songsDone) {
        songList.appendChild(div);
        song.el.parentNode.removeChild(song.el);
      }
      page++;
      if (song.favorite) {
        var clone = div.cloneNode();
        clone.addEventListener("click", function () {
          selectSong(song);
        });
        favoriteList.appendChild(clone);
      }
    });
    songsDone = true;
  }

  refreshList();

  var songsContainer = document.getElementById("songs");
  songs.forEach(function (song) {
    songsContainer.appendChild(song.el);
  });

  function back() {
    document.getElementById("songs").classList.add("hidden");
    songs.forEach(function (song) {
      song.el.style.display = "";
    });
    document.getElementById("controls").style.display = "";
    location.hash = "";
  }

  function selectSong(song) {
    document.getElementById("controls").style.display = "none";
    songs.forEach(function (s) {
      s.el.style.display = "none";
    });
    song.el.style.display = "";
    document.getElementById("songs").classList.remove("hidden");
    location.hash = "#" + encodeURIComponent(song.name);
    window.scrollTo(0, 0);
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
