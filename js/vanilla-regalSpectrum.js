var RegalSpectrum = function(selector, options){
	var plugin = this;
	
	plugin.el = (typeof(selector) === 'object') ? selector : (selector.indexOf('#') >= 0) ? document.getElementById(selector.replace('#', '')) : document.querySelector(selector);
	
	//on récupère les data-XXX
	var defaults = {
		spectreView: (plugin.el.getAttribute('data-spectreView') && plugin.el.getAttribute('data-spectreView') != '') ? plugin.el.getAttribute('data-spectreView') : 1,
		sinusoidView: (plugin.el.getAttribute('data-sinusoidView') && plugin.el.getAttribute('data-sinusoidView') != '') ? plugin.el.getAttribute('data-sinusoidView') : 1,
		circlesView: (plugin.el.getAttribute('data-circlesView') && plugin.el.getAttribute('data-circlesView') != '') ? plugin.el.getAttribute('data-circlesView') : 1,
		stopOthers: (plugin.el.getAttribute('data-stopOthers') && plugin.el.getAttribute('data-stopOthers') != '') ? plugin.el.getAttribute('data-stopOthers') : 1,
		autoPlay: (plugin.el.getAttribute('data-autoplay') && plugin.el.getAttribute('data-autoplay') != '') ? plugin.el.getAttribute('data-autoplay') : 0,
		color: (plugin.el.getAttribute('data-color') && plugin.el.getAttribute('data-color') != '') ? plugin.el.getAttribute('data-color') : 0,
		volumeView: (plugin.el.getAttribute('data-volumeView') && plugin.el.getAttribute('data-volumeView') != '') ? plugin.el.getAttribute('data-volumeView') : 1,
		loop: (plugin.el.getAttribute('data-loop') && plugin.el.getAttribute('data-loop') != '') ? plugin.el.getAttribute('data-loop') : 0,
		spectrumFft: (plugin.el.getAttribute('data-spectrumFft') && plugin.el.getAttribute('data-spectrumFft') != '') ? plugin.el.getAttribute('data-spectrumFft') : 256,
		sineWaveFft: (plugin.el.getAttribute('data-sineWaveFft') && plugin.el.getAttribute('data-sineWaveFft') != '') ? plugin.el.getAttribute('data-sineWaveFft') : 1024
	};
	
	//On récupère le data-values qui écrase les data-XXX éventuelles
	if(plugin.el.getAttribute('data-values')){
		var dataValues = plugin.el.getAttribute('data-values').replace(/'/g, '"');
		dataObj = JSON.parse(dataValues);
		defaults = {
			'spectreView': (dataObj.spectreView != null) ? dataObj.spectreView : defaults.spectreView,
			'sinusoidView':(dataObj.sinusoidView != null) ? dataObj.sinusoidView : defaults.sinusoidView,
			'circlesView': (dataObj.circlesView != null) ? dataObj.circlesView : defaults.circlesView,
			'stopOthers': (dataObj.stopOthers != null) ? dataObj.stopOthers : defaults.stopOthers,
			'autoPlay': (dataObj.autoPlay != null) ? dataObj.autoPlay : defaults.autoPlay,
			'color': (dataObj.color != null) ? dataObj.color : defaults.color,
			'volumeView': (dataObj.volumeView != null) ? dataObj.volumeView : defaults.volumeView,
			'loop': (dataObj.loop != null) ? dataObj.loop : defaults.loop,
			'spectrumFft': (dataObj.spectrumFft != null) ? dataObj.spectrumFft : defaults.spectrumFft,
			'sineWaveFft': (dataObj.sineWaveFft != null) ? dataObj.sineWaveFft : defaults.sineWaveFft
		}; 
	}
	
	if (typeof Object.assign != 'function') {
	  Object.assign = function(target, varArgs) { // .length of function is 2
		'use strict';
		if (target == null) { // TypeError if undefined or null
		  throw new TypeError('Cannot convert undefined or null to object');
		}
		var to = Object(target);
		for (var index = 1; index < arguments.length; index++) {
		  var nextSource = arguments[index];
		  if (nextSource != null) { // Skip over if undefined or null
			for (var nextKey in nextSource) {
			  // Avoid bugs when hasOwnProperty is shadowed
			  if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
				to[nextKey] = nextSource[nextKey];
			  }
			}
		  }
		}
		return to;
	  };
	}
	
	//on merge defaults et les options passées en js lors de la déclaration du constructeur (les options js écrasent les data- HTML
	plugin.o = Object.assign({}, defaults, options);
	
	//polyfill forEach NodeList & HTMLCollection
	if (!NodeList.prototype.forEach) {
		NodeList.prototype.forEach = Array.prototype.forEach;
	}
	if (!HTMLCollection.prototype.forEach) {
		HTMLCollection.prototype.forEach = Array.prototype.forEach;
	}
	
	//is mobile
	var isMobile = { 
		Android: function() { return navigator.userAgent.match(/Android/i); }, 
		BlackBerry: function() { return navigator.userAgent.match(/BlackBerry/i); }, 
		iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); }, 
		Opera: function() { return navigator.userAgent.match(/Opera Mini/i); }, 
		Windows: function() { return navigator.userAgent.match(/IEMobile/i); }, 
		any: function() { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); } 
	};

	var w = window,
	d = document,
	e = d.documentElement,
	g = d.getElementsByTagName('body')[0]
	
	var windowWidth = w.innerWidth||e.clientWidth||g.clientWidth,
		windowHeight = w.innerHeight||e.clientHeight||g.clientHeight,
		scrollTop = w.pageYOffset;
		
	var audioContextOK = true;
	if (! window.AudioContext) {
		if (! window.webkitAudioContext) {
			// disable spectrum for old browsers 
			audioContextOK = false;
		}
		window.AudioContext = window.webkitAudioContext;
	}
	
	var initWindowVars = function(){
		windowWidth = w.innerWidth||e.clientWidth||g.clientWidth,
		windowHeight = w.innerHeight||e.clientHeight||g.clientHeight,
		scrollTop = window.pageYOffset;
	};
	initWindowVars();
	
	//vars
	//test display canvas spectrum/sinus/circles/volume
	var displaySpectrum = (plugin.o.spectreView && plugin.el.querySelector(".spectrum")) ? 1 : 0;
	var displaySineWave = (plugin.o.sinusoidView && plugin.el.querySelector(".sineWave")) ? 1 : 0;
	var displayCircles = (plugin.o.circlesView && plugin.el.querySelector(".circles")) ? 1 : 0;
	var displayVolume = (plugin.o.volumeView && plugin.el.querySelector(".volume-canvas")) ? 1 : 0;
	//meter for volumeDraw
	var meter;
	// color
	var randR = Math.round(Math.random() * (255 - 0) + 0);
	var randV = Math.round(Math.random() * (255 - 0) + 0);
	var randB = Math.round(Math.random() * (255 - 0) + 0);
	if(defaults.color){
		var colors = defaults.color.split(',');
		randR = colors[0];
		randV = colors[1];
		randB = colors[2];
	}
	// vars for contextAudio
	var sourceNode;
	var analyser;
	var javascriptNode;
	// dataObj for HTML data-values
	var dataObj;
	// find sourceSound
	var sourceSound = plugin.el.querySelector('.sourceSound');
	
	var updateCanvasWidth = function(){
		if(displaySpectrum){
			spectrumWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
			plugin.el.querySelectorAll(".spectrum").forEach(function(el){
				el.width = spectrumWidth;
			});
		}
		if(displaySineWave){
			sineWaveWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
			plugin.el.querySelector(".sineWave").width = sineWaveWidth;
		}
		if(displayCircles){
			circlesWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
			plugin.el.querySelector(".circles").width = circlesWidth;
		}
	}
	
	//events
	var setEvents = function() {
		window.addEventListener('resizeEnd', function() {
			initWindowVars();
			updateCanvasWidth();
		});
		
		window.addEventListener('resize', function(){
			updateCanvasWidth();
		});
	}
	
	var init = function(){
		// init spectrum height and width
		if(displaySpectrum){
			plugin.el.querySelectorAll(".spectrum").forEach(function(el){
				el.height = spectrumHeight;
				el.width = spectrumWidth;
			});
		}
		// init sineWave height and width
		if(displaySineWave){
			plugin.el.querySelector(".sineWave").height = sineWaveHeight;
			plugin.el.querySelector(".sineWave").width = sineWaveWidth;
		}
		// init circles height and width
		if(displayCircles){
			plugin.el.querySelector(".circles").height = circlesHeight;
			plugin.el.querySelector(".circles").width = circlesWidth;
		}
		
		//audiocontext
		if(audioContextOK){
			setContext();
			var canplayonceonly = true;
			sourceSound.addEventListener('canplay', function() {
				if(canplayonceonly){
					canplayonceonly = false;
					if(plugin.el.querySelectorAll('.chapter-line')){
						plugin.el.querySelectorAll('.chapter-line').forEach(function(el) {
							var percent = (100 / sourceSound.duration) * parseFloat(el.getAttribute('data-time')) + "%";
							el.style.left = percent;
						});
					}
					plugin.ready = true;
					//autoplay (not for safari and not for mobiles that block autoplay)
					var safari = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1);
					if(plugin.o.autoPlay && !safari && !isMobile.any()){
						play();
					}
				}
			});
		}
		else{
			w.addEventListener('load', function() {
				setTimeout(function(){
					if(plugin.el.querySelectorAll('.chapter-line')){
						plugin.el.querySelectorAll('.chapter-line').forEach(function(el) {
							var percent = (100 / sourceSound.duration) * parseFloat(el.getAttribute('data-time')) + "%";
							el.style.left = percent;
						});
						plugin.el.querySelectorAll('.chapters-line').forEach(function(el) {
							el.style.display = '';
						});
					}
				}, 500);
			});
			//plugin.ready for old browsers
			plugin.ready = true;
			//hide chapters-line
			plugin.el.querySelectorAll('.chapters-line').forEach(function(el) {
				el.style.display = 'none';
			});
			if(plugin.o.autoPlay){
				play();
			}
		}
		// playing update
		plugin.el.querySelector('.sourceSound').addEventListener('timeupdate', function() {
			// update seekbar
			updateSeekbar();
		});
		// timeline navigation
		plugin.el.querySelector('.timeline .progress').addEventListener('click', function(event) {
			var clickPosition = event.clientX;
			var lineOffset = plugin.el.querySelector('.container').getBoundingClientRect().left + document.body.scrollLeft;
			var lineLength = parseInt(getComputedStyle(plugin.el.querySelector('.timeline .progress .line')).width);
			var time = sourceSound.duration * ((clickPosition - lineOffset) / lineLength);
			seek(time);
			// autoplay
			if(plugin.el.querySelector('.play').classList.contains('pause')) {
				plugin.el.querySelector('.play').dispatchEvent(new Event('click'));  
			}
		});
		
		//chapters
		if(plugin.el.querySelector('.chapter')){
			plugin.el.querySelector('.chapter').forEach(function(el){
				el.addEventListener('click', function(e){
					e.preventDefault();
					var time = e.target.getAttribute('data-time');
					seek(time);
					plugin.el.querySelector('.chapter.active').classList.remove('active');
					e.target.classList.add('active');
				});
			});
		}
		
		//chapter-line
		if(plugin.el.querySelectorAll('.chapter-line')){
			plugin.el.querySelectorAll('.chapter-line').forEach(function(el){
				el.addEventListener('click', function(e){
					e.preventDefault();
					e.stopImmediatePropagation();
					var time = e.target.getAttribute('data-time');
					seek(time);
				});
			});
			plugin.el.querySelectorAll('.chapter-line').forEach(function(el, index){
				el.addEventListener('mouseover', function(e){
					var button = plugin.el.querySelectorAll('.chapter')[index];
					if(button){
						button.classList.add('hover');
					}
					var roll = plugin.el.querySelector('.chapters-line-roll');
					var lineOffset = plugin.el.querySelector('.container').offsetLeft;
					var pox = e.target.offsetLeft - lineOffset;
					roll.textContent = e.target.textContent;
					if(pox + roll.offsetWidth > plugin.el.querySelector('.container').offsetWidth){
						pox = plugin.el.querySelector('.container').offsetWidth - roll.offsetWidth;
					}
					roll.style.left = pox + 'px';
					roll.classList.add('visible');
				});
				el.addEventListener('mouseout', function(e){
					var button = plugin.el.querySelectorAll('.chapter')[index];
					if(button){
						button.classList.remove('hover');
					}
					plugin.el.querySelector('.chapters-line-roll').classList.remove('visible');
				});
			});
		}
		
		// toggle play / pause
		plugin.el.querySelector('.play').addEventListener('click', function(e) {
			if(e.target.classList.contains('pause')) {
				play();
			} 
			else{
				pause();
			}
		});
		
		// toggle volume
		plugin.el.querySelector('.volume').addEventListener('click', function(e) {
			if(e.target.classList.contains('off')) {
				setVolume(1);
				e.target.classList.remove('off');
			} 
			else{
				setVolume(0);
				e.target.classList.add('off');
			}
		});
	}
	
	var setContext = function(){
		// setup a javascript node
		javascriptNode = context.createScriptProcessor(2048, 1, 1);
		javascriptNode.connect(context.destination);
		// setup a analyzer
		analyser = context.createAnalyser();
		analyser.smoothingTimeConstant = 0.3;
		sourceNode = context.createMediaElementSource(sourceSound);
		sourceNode.connect(analyser);
		analyser.connect(javascriptNode);
		sourceNode.connect(context.destination);
		//meter pour drawVolume de précision
		meter = createAudioMeter(context);
		sourceNode.connect(meter);
	}
	
	var play = function(){
		/*sourceSound.play().then(
			function(){
				//successCallback
				if(plugin.o.stopOthers){
					if(document.querySelector('.spectrumSound.active')){
						document.querySelector('.spectrumSound.active').querySelector('.play').dispatchEvent(new Event('click'));
					}
				}
				plugin.el.classList.add('active');
				if(plugin.el.querySelector('.sourceSound').classList.contains('video')){
					plugin.el.querySelector('.sourceSound').classList.add('active');
					var h = parseInt(getComputedStyle(plugin.el.querySelector('.sourceSound')).height) + (parseInt(plugin.el.querySelector('.sourceSound').style.paddingTop, 10) * 2);
					plugin.el.style.height = h + 'px';
				}
				draw();
				plugin.el.querySelector('.play').classList.remove('pause');
			},
			function(){
				//failureCallback
			}
		);*/
		sourceSound.play();
		if(plugin.o.stopOthers){
			if(document.querySelector('.spectrumSound.active')){
				document.querySelector('.spectrumSound.active').querySelector('.play').dispatchEvent(new Event('click'));
			}
		}
		plugin.el.classList.add('active');
		if(plugin.el.querySelector('.sourceSound').classList.contains('video')){
			plugin.el.querySelector('.sourceSound').classList.add('active');
			var h = parseInt(getComputedStyle(plugin.el.querySelector('.sourceSound')).height) + (parseInt(plugin.el.querySelector('.sourceSound').style.paddingTop, 10) * 2);
			plugin.el.style.height = h + 'px';
		}
		draw();
		plugin.el.querySelector('.play').classList.remove('pause');
			
	}
	
	var pause = function(){
		sourceSound.pause();
		plugin.el.classList.remove('active');
		if(plugin.el.querySelector('.sourceSound').classList.contains('video')){
			plugin.el.querySelector('.sourceSound').classList.remove('active');
			plugin.el.style.height = 'auto';
		}
		cancelAnimationFrame(drawAnimationFrame);
		plugin.el.querySelector('.play').classList.add('pause');
	}
	
	var seek = function(time){
		var durationLoaded = sourceSound.buffered.end(sourceSound.buffered.length - 1);
		setTimeout(function(){
			sourceSound.currentTime = time;
		}, 200);
	}
	
	var setVolume = function(vol){
		sourceSound.volume = vol;
	}
	
	// Dessiner les canvas
	var drawAnimationFrame;
	var draw = function() {
		if(audioContextOK){
			drawAnimationFrame = requestAnimationFrame(draw);
			//sineWave
			if(displaySineWave){
				drawSineWave();
			}
			//bars
			if(displaySpectrum){
				drawSpectrum();
			}
			//circles
			if(displayCircles){
				drawCircles();
			}
			//volume
			if(displayVolume){
				drawVolume();
			}
		}
	}
		
	// create the audio context
	if(audioContextOK){
		// 1 seul context par page !
		if(!window.context){
			window.context = new AudioContext();
		}
		var context = window.context;
		
		sourceSound.addEventListener('ended',
			function(){
				seek(0);
				pause();
				if(defaults.loop){
					play();
				}
			}
		,false);
	}
	
	// sineWave
	if(displaySineWave){
		var ctxCanvasSineWave = plugin.el.querySelector('.sineWave').getContext("2d");
		var sineWaveWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
		var sineWaveHeight = plugin.el.querySelector('.sineWave').height;
		var sineWaveFft = plugin.o.sineWaveFft;
		var bufferLength;				
		function drawSineWave() {
			analyser.fftSize = sineWaveFft;
			bufferLength = analyser.fftSize;				
			var dataArray = new Uint8Array(bufferLength);
			analyser.getByteTimeDomainData(dataArray);
			// clear the current state
			ctxCanvasSineWave.clearRect(0, 0, sineWaveWidth, sineWaveHeight);
			// set the fill style
			ctxCanvasSineWave.fillStyle = 'rgba(0, 0, 0, 0)';
			ctxCanvasSineWave.fillRect(0, 0, sineWaveWidth, sineWaveHeight);
			ctxCanvasSineWave.lineWidth = 10;
			ctxCanvasSineWave.strokeStyle = "rgba("+(255-randR)+", "+(255-randV)+", "+(255-randB)+", 0.5)";
			ctxCanvasSineWave.beginPath();
			var sliceWidth = sineWaveWidth * 1.0 / bufferLength;
			var x = 0;
			for(var i = 0; i < bufferLength; i++) {
				var v = dataArray[i] / 128.0;
				var y = v * sineWaveHeight/2;
				if(i === 0) {
					ctxCanvasSineWave.moveTo(x, y);
				} 
				else {
					ctxCanvasSineWave.lineTo(x, y);
				}
				x += sliceWidth;
			}
			ctxCanvasSineWave.lineTo(sineWaveWidth, sineWaveHeight/2);
			ctxCanvasSineWave.stroke();
		};
	}
	
	// spectrum
	if(displaySpectrum){
		var spectrumHeightRatio = 0.5;
		var spectrumHeight = parseInt(getComputedStyle(plugin.el.querySelector(".spectrum")).height);
		var spectrumFft = plugin.o.spectrumFft;
		var spectrumVide = (spectrumFft/2) - Math.floor((spectrumFft/2) * 71.8 / 100); // j'ai remarqué que les dernières données du array analyser.getByteFrequencyData(analyser.frequencyBinCount) étaient toujours égales à zéro (faiblesse du mp3?) alors je les zappe de mes traitements graphiques !
		var spectrumWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
		var displayPos = plugin.el.querySelector(".spectrumPos") ? 1 : 0;
		var displayNeg = plugin.el.querySelector(".spectrumNeg") ? 1 : 0;
		if(displayPos){
			var ctxCanvasSpectrumPos = plugin.el.querySelector(".spectrumPos").getContext("2d");
		}
		if(displayNeg){
			var ctxCanvasSpectrumNeg = plugin.el.querySelector(".spectrumNeg").getContext("2d");
		}
		function drawSpectrum() {
			analyser.fftSize = spectrumFft;
			var array =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			if(displayPos){
				ctxCanvasSpectrumPos.clearRect(0, 0, spectrumWidth, spectrumHeight);
				ctxCanvasSpectrumPos.fillStyle = "rgba("+randR+", "+randV+", "+randB+", 0.5)";
			}
			if(displayNeg){
				ctxCanvasSpectrumNeg.clearRect(0, 0, spectrumWidth, spectrumHeight);
				ctxCanvasSpectrumNeg.fillStyle = "rgba("+randR+", "+randV+", "+randB+", 0.5)";
			}
			for ( var i = 0; i < (array.length - spectrumVide); i++ ){
				var value = array[i];
				var barHeight = value*spectrumHeightRatio;
				var x = (i*((spectrumWidth/(array.length-spectrumVide))*1)) + 1;
				var y = 0;
				var w = ((spectrumWidth/(array.length-spectrumVide))*1) - 1;
				var h = barHeight;
				if(displayPos){
					ctxCanvasSpectrumPos.fillRect(x, y, w, h);
				}
				if(displayNeg){
					ctxCanvasSpectrumNeg.fillRect(x, y, w, h);
				}
			}
		};
	}
	// circles
	if(displayCircles){
		var circlesHeightRatio = 0.25;
		var circlesHeight = parseInt(getComputedStyle(plugin.el.querySelector(".circles")).height);
		var circlesFft = 32;
		var circlesWidth = (plugin.el.querySelector(".timeline .container").clientWidth > 0) ? plugin.el.querySelector(".timeline .container").clientWidth : windowWidth;
		var ctxCanvascircles = plugin.el.querySelector(".circles").getContext("2d");	
		function drawCircles() {
			analyser.fftSize = circlesFft;
			var circlesArray =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteTimeDomainData(circlesArray);
			// clear the current state
			ctxCanvascircles.clearRect(0, 0, circlesWidth, circlesHeight);
			// set the fill style
			ctxCanvascircles.fillStyle = "rgba("+randR+", "+randV+", "+randB+", "+5/circlesFft+")";
			var x = ((sourceSound.currentTime/sourceSound.duration)*circlesWidth) - parseInt(plugin.el.querySelector(".circles").offsetLeft, 10);
			for(var i = circlesArray.length-1; i >=0; i--) {
				ctxCanvascircles.beginPath();
				var v = circlesArray[i] * circlesHeightRatio;
				var y = circlesHeight/2;
				ctxCanvascircles.arc(x, y, v, 0, 2*Math.PI);
				ctxCanvascircles.fill();
			}
		};
	}
	//volume-canvas
	function createAudioMeter(audioContext,clipLevel,averaging,clipLag) {
		var processor = audioContext.createScriptProcessor(512);
		processor.onaudioprocess = volumeAudioProcess;
		processor.clipping = false;
		processor.lastClip = 0;
		processor.volume = 0;
		processor.clipLevel = clipLevel || 0.98;
		processor.averaging = averaging || 0.95;
		processor.clipLag = clipLag || 750;
		// this will have no effect, since we don't copy the input to the output,
		// but works around a current Chrome bug.
		processor.connect(audioContext.destination);
		processor.checkClipping =
			function(){
				if (!this.clipping)
					return false;
				if ((this.lastClip + this.clipLag) < window.performance.now())
					this.clipping = false;
				return this.clipping;
			};
		processor.shutdown =
			function(){
				this.disconnect();
				this.onaudioprocess = null;
			};
		return processor;
	}
	function volumeAudioProcess( event ) {
		var buf = event.inputBuffer.getChannelData(0);
		var bufLength = buf.length;
		var sum = 0;
		var x;
		// Do a root-mean-square on the samples: sum up the squares...
		for (var i=0; i<bufLength; i++) {
			x = buf[i];
			if (Math.abs(x)>=this.clipLevel) {
				this.clipping = true;
				this.lastClip = window.performance.now();
			}
			sum += x * x;
		}
		// ... then take the square root of the sum.
		var rms =  Math.sqrt(sum / bufLength);
		// Now smooth this out with the averaging factor applied
		// to the previous sample - take the max here because we
		// want "fast attack, slow release."
		this.volume = Math.max(rms, this.volume*this.averaging);
	}
	
	if(displayVolume){
		var ctxCanvasVolume = plugin.el.querySelector(".volume-canvas").getContext("2d");
		var volumeGradient = ctxCanvasVolume.createLinearGradient(0,0,0,150);
		function drawVolume(){
			//console.log(meter.volume);
			volumeGradient = ctxCanvasVolume.createLinearGradient(0,0,0,150);
			volumeGradient.addColorStop(1, 'rgba('+randR+', '+randV+', '+randB+', 1)');
			volumeGradient.addColorStop(0.75, 'rgba('+randR+', '+randV+', '+randB+', 0.7)');
			volumeGradient.addColorStop(0.25, 'rgba('+randR+', '+randV+', '+randB+', 0.5)');
			volumeGradient.addColorStop(0, 'rgba('+randR+', '+randV+', '+randB+', 0.3)');
			var average = 150*(meter.volume*2);
			// clear the current state
			ctxCanvasVolume.clearRect(0, 0, 280, 150);
			// set the fill style
			ctxCanvasVolume.fillStyle = volumeGradient;
			// create the meters
			ctxCanvasVolume.fillRect(0, 150-average, 280, average);
		}
	}
	
	//update seek bar
	var lastUpdateSeekbar = 0;
	var updateSeekbar = function() {
		// limit exec interval to 300ms
		if(lastUpdateSeekbar > 0 && Math.abs(lastUpdateSeekbar - sourceSound.currentTime) < 0.3) {
			return true;
		}
		lastUpdateSeekbar = sourceSound.currentTime;

		// update timeline
		var percent = (100 / sourceSound.duration) * sourceSound.currentTime + "%";
		plugin.el.querySelector('.timeline .progress .line .current').style.width = percent;

		// update current time
		var currentTime =  sourceSound.currentTime;
		var currentMinutes = Math.floor(currentTime / 60);
		var currentSeconds = Math.floor(currentTime % 60);
		if(currentSeconds.toString().length < 2) {
			currentSeconds = '0' + currentSeconds;
		}
		plugin.el.querySelector('.timeline .currentTime').innerHTML = currentMinutes + ":" + currentSeconds;

		// update remaining time
		var remainingTime = sourceSound.duration - sourceSound.currentTime;
		var remainingMinutes = Math.floor(remainingTime / 60);
		var remainingSeconds = Math.floor(remainingTime % 60);
		if(remainingSeconds.toString().length<2) {
			remainingSeconds = '0' + remainingSeconds;
		}
		plugin.el.querySelector('.timeline .remainingTime').innerHTML = "- " + remainingMinutes + ":" + remainingSeconds;
		
		//chapters
		plugin.el.querySelectorAll('.chapter-line').forEach(function(el){
			var chapterTime = el.getAttribute('data-time');
			var chapterEnd = el.getAttribute('data-end');
			if(currentTime >= parseFloat(chapterTime)) {
				el.classList.add('done')
				el.classList.remove('active');
				if(currentTime < parseFloat(chapterEnd)){
					el.classList.remove('done');
					el.classList.add('active');
				}
			}
			else{
				el.classList.remove('done');
				el.classList.remove('active');
			}
		});
	}
	
	plugin.ready = false;
	plugin.play = function(){
		play();
	}
	plugin.pause = function(){
		pause();
	}
	plugin.seek = function(time){
		seek(time);
	}
	plugin.setVolume = function(vol){
		setVolume(vol);
	}
	plugin.changeColor = function(color){
		if(colors){
			var colors = color.split(',');
			randR = colors[0];
			randV = colors[1];
			randB = colors[2];
		}
		else{
			randR = Math.round(Math.random() * (255 - 125) + 125);
			randV = Math.round(Math.random() * (255 - 125) + 125);
			randB = Math.round(Math.random() * (255 - 125) + 125);
		}
	}
	
	setEvents();
	init();
}