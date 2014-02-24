window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext;
var context = new AudioContext();

//master gain node
var master = context.createGain();
master.connect(context.destination);

var ready = false;

// loading a sound with XML HTTP REQUEST
function addAudioFromURI(URI, bufferList){
	var request = new XMLHttpRequest();
	request.open('GET',URI,true);
	request.responseType = "arraybuffer";
	request.onload = function(){
		context.decodeAudioData(request.response,function(b){
			bufferList.push(b); //set the buffer
			data = b.getChannelData(0);
			ready = true;
		},function(){
			console.log('loading failed')
		});
	};
	request.send();
}

// loading a sound with a file reference
function addAudioFromFile(file, bufferList) 
{
	var reader = new FileReader();
	reader.onload = function(e){
		var array = e.target.result;
		context.decodeAudioData(array,function(b){
			bufferList.push(b);
			data = b.getChannelData(0);
			ready = true;
		},function(){
			console.log('loading failed');
		});
	}
	reader.readAsArrayBuffer(f);
}

// Play back a buffer, with fade in and fade out
var playBuffer = function(buffer, fadeInSeconds, fadeOutSeconds, startPosSeconds, amp){
	if (ready == false){
		return;
	}
	var that = this;
	
	this.stop = function(fadeOutSeconds){
		this.playing = false;
		console.log("Got a call to stop..");
		that.gain.gain.linearRampToValueAtTime(0,context.currentTime + fadeOutSeconds);
		//that.source.stop(context.currentTime + fadeOutSeconds);
		var tms = fadeOutSeconds * 1000;
		setTimeout(function(){
			that.gain.disconnect();
		},tms + 200);
		
		return context.currentTime - that.now + startPosSeconds;
	}
	
	this.now = context.currentTime;
	
	this.source = context.createBufferSource();
	this.source.buffer = buffer;
	// Create a gain for fade in and fade out
	this.gain = context.createGain();
	this.source.connect(this.gain);
	this.gain.connect(master);
	
	// Set gains / fades
	this.gain.gain.setValueAtTime(0.0, this.now);
	this.gain.gain.linearRampToValueAtTime(amp,this.now + fadeInSeconds);
	this.gain.gain.setValueAtTime(amp, this.now + buffer.duration - fadeOutSeconds);
	this.gain.gain.linearRampToValueAtTime(0,this.now + buffer.duration);
	
	// Start playback
	this.source.start(this.now,startPosSeconds,buffer.duration);
	this.playing = true;

	//garbage collection
	this.source.stop(this.now + buffer.duration + 0.1); 
	var tms = (buffer.duration) * 1000; //calculate the time in miliseconds
	setTimeout(function(){
		that.gain.disconnect();
	},tms + 200);
	
	return;
}

playGrain = function(buffer, pos, amp, attack, release, transpose, spread){
        if (ready == false) {
            return
        }
	
	var that = this;
	this.now = context.currentTime;
	
	this.source = context.createBufferSource();
	this.source.buffer = buffer;
	this.source.playbackRate.value = this.source.playbackRate.value * transpose;
	// Create a gain for enveloping
	this.gain = context.createGain();
	this.source.connect(this.gain);
	this.gain.connect(master);
	
	/* Jump to position in buffer with some random jitter defined by spread */
	this.offset = pos;
	this.randomoffset = (Math.random() * spread) - (spread / 2);
	
	this.gain.gain.setValueAtTime(0.0, this.now);
	this.gain.gain.linearRampToValueAtTime(amp,this.now + attack);
	this.gain.gain.linearRampToValueAtTime(0,this.now + (attack + release) );
	// Start the playback with enveloping
	this.source.start(this.now, this.offset + this.randomoffset, attack + release);
	
	//garbage collection
	this.source.stop(this.now + attack + release + 0.1); 
	var tms = (attack + release) * 1000; //calculate the time in miliseconds
	setTimeout(function(){
		that.gain.disconnect();
	},tms + 200);
}

/* For normally distributed offsets etc. */
Math.nrand = function() {
	var x1, x2, rad, y1;
	do {
		x1 = 2 * this.random() - 1;
		x2 = 2 * this.random() - 1;
		rad = x1 * x1 + x2 * x2;
	} while(rad >= 1 || rad == 0);
	var c = this.sqrt(-2 * Math.log(rad) / rad);
	return x1 * c;
};