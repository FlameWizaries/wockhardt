// document.addEventListener("DOMContentLoaded", () => {
//     class PremiumPlayer {
//         static active = null;

//         constructor(video) {
//             this.video = video;

//             this.wrapper = video.closest(".academy-video-wrapper");

//             this.player = new Plyr(video, {
//                 controls: [
//                     "play-large",
//                     "play",
//                     "progress",
//                     "current-time",
//                     "duration",
//                     "mute",
//                     "volume",
//                     "settings",
//                     "fullscreen",
//                 ],

//                 settings: ["speed"],

//                 speed: {
//                     selected: 1,

//                     options: [0.5, 0.75, 1, 1.25, 1.5, 2],
//                 },

//                 fullscreen: {
//                     enabled: true,
//                     fallback: true,
//                     iosNative: true,
//                 },

//                 ratio: "16:9",
//             });

//             this.createOverlay();

//             this.bindEvents();
//         }

//         createOverlay() {

//             let plyrContainer = this.player.elements.container;

//             let overlay = plyrContainer.querySelector(".video-overlay");

//             if (!overlay) {
//                 overlay = document.createElement("div");

//                 overlay.className = "video-overlay";

//                 plyrContainer.appendChild(overlay);
//             }

//             overlay.innerHTML = `


// <div class="seek-ripple seek-ripple-left">

//     <div class="ripple-circle">

//         <span>⏪</span>

//         <strong>-10 сек</strong>

//     </div>

// </div>



// <div class="seek-ripple seek-ripple-right">

//     <div class="ripple-circle">

//         <span>⏩</span>

//         <strong>+10 сек</strong>

//     </div>

// </div>



// <div class="play-hud">

//     <div class="play-hud-icon">
//         ▶
//     </div>

// </div>



// <div class="volume-hud">


//     <div class="volume-icon">
//         🔊
//     </div>



//     <div class="volume-bar">

//         <div class="volume-fill"></div>

//     </div>



//     <div class="volume-value">
//         100%
//     </div>


// </div>



// `;

//             this.overlay = overlay;

//             this.playHud = overlay.querySelector(".play-hud");

//             this.playIcon = overlay.querySelector(".play-hud-icon");

//             this.volumeHud = overlay.querySelector(".volume-hud");

//             this.volumeFill = overlay.querySelector(".volume-fill");

//             this.volumeValue = overlay.querySelector(".volume-value");

//             this.volumeIcon = overlay.querySelector(".volume-icon");

//             this.rippleLeft = overlay.querySelector(".seek-ripple-left");

//             this.rippleRight = overlay.querySelector(".seek-ripple-right");
//         }

//         bindEvents() {
//             this.player.on("play", () => {
//                 PremiumPlayer.active = this;

//                 document.querySelectorAll(".player").forEach((v) => {
//                     if (v !== this.video) {
//                         if (v.plyr) v.plyr.pause();
//                     }
//                 });

//                 this.showPlayHUD("▶");
//             });

//             this.player.on("pause", () => {
//                 this.showPlayHUD("❚❚");
//             });

//             this.player.on("volumechange", () => {
//                 this.showVolumeHUD();
//             });

//             this.bindMouseSeek();

//             this.bindTouchSeek();

//             this.bindKeyboard();

//             this.bindAutoHide();

//             this.bindFullscreen();
//         }

//         showPlayHUD(icon) {
//             this.playIcon.textContent = icon;

//             this.playHud.classList.remove("show");

//             void this.playHud.offsetWidth;

//             this.playHud.classList.add("show");
//         }

//         showVolumeHUD() {
//             let volume = Math.round(this.player.volume * 100);

//             this.volumeValue.textContent = volume + "%";

//             this.volumeFill.style.width = volume + "%";

//             if (this.player.muted || volume === 0) {
//                 this.volumeIcon.textContent = "🔇";
//             } else if (volume < 50) {
//                 this.volumeIcon.textContent = "🔉";
//             } else {
//                 this.volumeIcon.textContent = "🔊";
//             }

//             this.volumeHud.classList.remove("show");

//             void this.volumeHud.offsetWidth;

//             this.volumeHud.classList.add("show");
//         }

//         showRipple(side, sec) {
//             let el = side === "left" ? this.rippleLeft : this.rippleRight;

//             if (!el) return;

//             el.querySelector("strong").textContent =
//                 (side === "left" ? "-" : "+") + sec + " сек";

//             el.classList.remove("active");

//             void el.offsetWidth;

//             el.classList.add("active");
//         }

//         bindMouseSeek() {
//             this.wrapper.addEventListener("dblclick", (e) => {
//                 let rect = this.wrapper.getBoundingClientRect();

//                 let x = e.clientX - rect.left;

//                 if (x < rect.width / 2) {
//                     this.player.currentTime = Math.max(
//                         0,
//                         this.player.currentTime - 10,
//                     );

//                     this.showRipple("left", 10);
//                 } else {
//                     this.player.currentTime = Math.min(
//                         this.player.duration,
//                         this.player.currentTime + 10,
//                     );

//                     this.showRipple("right", 10);
//                 }
//             });
//         }

//         bindTouchSeek() {
//             let lastTap = 0;

//             this.wrapper.addEventListener("touchend", (e) => {
//                 let now = Date.now();

//                 if (now - lastTap < 300) {
//                     let rect = this.wrapper.getBoundingClientRect();

//                     let x = e.changedTouches[0].clientX - rect.left;

//                     if (x < rect.width / 2) {
//                         this.player.currentTime -= 10;

//                         this.showRipple("left", 10);
//                     } else {
//                         this.player.currentTime += 10;

//                         this.showRipple("right", 10);
//                     }
//                 }

//                 lastTap = now;
//             });
//         }

//         bindKeyboard() {
//             document.addEventListener(
//                 "keydown",
//                 (e) => {
//                     if (
//                         e.target.tagName === "INPUT" ||
//                         e.target.tagName === "TEXTAREA"
//                     ) {
//                         return;
//                     }

//                     if (PremiumPlayer.active !== this) {
//                         return;
//                     }

//                     switch (e.code) {
//                         case "Space":
//                             e.preventDefault();
//                             e.stopPropagation();

//                             if (this.video.paused) {
//                                 this.player.play();
//                             } else {
//                                 this.player.pause();
//                             }

//                             break;

//                         case "KeyK":
//                             e.preventDefault();

//                             if (this.video.paused) {
//                                 this.player.play();
//                             } else {
//                                 this.player.pause();
//                             }

//                             break;

//                         case "ArrowLeft":
//                             e.preventDefault();

//                             this.player.currentTime = Math.max(
//                                 0,
//                                 this.player.currentTime - 5,
//                             );

//                             this.showRipple("left", 5);

//                             break;

//                         case "ArrowRight":
//                             e.preventDefault();

//                             this.player.currentTime = Math.min(
//                                 this.player.duration,
//                                 this.player.currentTime + 5,
//                             );

//                             this.showRipple("right", 5);

//                             break;

//                         case "KeyJ":
//                             this.player.currentTime -= 10;

//                             this.showRipple("left", 10);

//                             break;

//                         case "KeyL":
//                             this.player.currentTime += 10;

//                             this.showRipple("right", 10);

//                             break;

//                         case "ArrowUp":
//                             e.preventDefault();

//                             this.player.volume = Math.min(
//                                 1,
//                                 this.player.volume + 0.1,
//                             );

//                             break;

//                         case "ArrowDown":
//                             e.preventDefault();

//                             this.player.volume = Math.max(
//                                 0,
//                                 this.player.volume - 0.1,
//                             );

//                             break;

//                         case "KeyM":
//                             this.player.muted = !this.player.muted;

//                             break;

//                         case "KeyF":
//                             this.player.fullscreen.toggle();

//                             break;
//                     }
//                 },
//                 true,
//             );
//         }


//         bindAutoHide() {
//             let timer;

//             this.wrapper.addEventListener("mousemove", () => {
//                 clearTimeout(timer);

//                 this.wrapper.classList.remove("idle");

//                 timer = setTimeout(() => {
//                     if (this.player.playing) this.wrapper.classList.add("idle");
//                 }, 3000);
//             });
//         }

//         bindFullscreen() {
//             document.addEventListener("fullscreenchange", () => {
//                 if (document.fullscreenElement && screen.orientation) {
//                     screen.orientation.lock("landscape").catch(() => {});
//                 }
//             });
//         }
//     }

//     if (typeof Plyr === "undefined") {
//         console.error("PLYR не загружен");

//         return;
//     }

//     const videos = document.querySelectorAll(".player");

//     window.premiumPlayers = [];

//     videos.forEach((video) => {
//         let p = new PremiumPlayer(video);

//         video.plyr = p.player;

//         window.premiumPlayers.push(p);
//     });

//     console.log("✅ Premium Plyr:", window.premiumPlayers.length);
// });

document.querySelectorAll(".rutube-player").forEach(player=>{

    player.addEventListener("click",()=>{

        if(player.dataset.loaded) return;

        player.dataset.loaded="true";

        const id=player.dataset.rutube;

        player.innerHTML=`

<iframe
src="https://rutube.ru/play/embed/${id}?autoplay=1"

allow="autoplay; fullscreen"

allowfullscreen

frameborder="0">

</iframe>

`;

    });

});