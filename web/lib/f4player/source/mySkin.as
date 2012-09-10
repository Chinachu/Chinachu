/*
╠═ f4.Skin ══════════════════════════════════════════════════════════════
  Software: f4.Skin - flash video player skin class
   Version: beta 1.3
   Support: http://gokercebeci.com
    Author: goker.cebeci
   Contact: http://gokercebeci.com
 -------------------------------------------------------------------------
   License: Distributed under the Lesser General Public License (LGPL)
            http://www.gnu.org/copyleft/lesser.html
 This program is distributed in the hope that it will be useful - WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE.
═══════════════════════════════════════════════════════════════════════════ */
package {
	import f4.PlayerInterface;
	import flash.display.MovieClip;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.media.Video;
	import flash.geom.Rectangle;

	public class mySkin extends MovieClip {
		var player:PlayerInterface;
		var info:Object = new Object();
		var fullscreen:Boolean=true;
		//var progress:Boolean=false;
		var playing:Boolean=false;
		var rectangle:Rectangle; // for seeker
		var padding:int=10;
		var barwidth:Number;
		var status:String;

		var video:String;
		var image:MovieClip = new MovieClip();

		var seeking:Boolean=false;

		public function mySkin() {
			trace("mySkin loaded!");
			pose(480,270);
		}
		public function initialization(player:PlayerInterface,W:Number,H:Number,video:String,thumbnail:String,autoplay:Boolean=false,fullscreen:Boolean=true):void {
			fullscreen = fullscreen;
			info.width = W;
			info.height = H;
			info.progress = 0;
			pose(W,H);
			nav.pauseButton.visible = false;
			nav.seeker.visible = false;
			nav.visible = false;
			//var togglepause:Boolean = false;
			var callback:Function = function(i:Object){
				if((i.width && i.height) && i.width != info.width && i.height != info.height){
					info = i;
					pose(W, H);
				}
				info = i;
				nav.progressBar.width = (info.progress * barwidth);
				nav.playingBar.width = (info.playing * barwidth);
				nav.seeker.x = nav.playingBar.x + (info.playing * barwidth);
				nav.seeker.currentTime.text = formatTime(info.time);
				if(status != info.status){
				switch(info.status){
					case "NetConnection.Connect.Success":
						//movie [
						var movie:Video=player.Movie(W,H);
						screen.addChildAt(movie,1);
						// ] movie
						//thumbnail [
						if(thumbnail){
							image = player.Thumbnail(thumbnail,W,H);
							screen.addChildAt(image,1);
						}
						// ] thumbnail
						// repose
						pose(W,H);
					break;
					case "NetConnection.Connect.Closed":
						stopEvent(new MouseEvent(MouseEvent.CLICK));
						break;
					case "NetStream.Play.Start" :
						nav.seeker.visible = true;
						image.visible = false;
					break;
					case "NetStream.Unpause.Notify":
					case "NetStream.Buffer.Empty" :
						buffering.visible = true;
					break;
					case "NetStream.Buffer.Full" :
						buffering.visible = false;
					break;
					case "NetStream.Play.Stop" :
						stopEvent(new MouseEvent(MouseEvent.CLICK));
					break;
				}
				status = info.status;
				}
			};
			// Callback Function
			player.Callback(callback);
			//═ PLAY ══════════════════════════════════════════════════════════════════════
			var playEvent:Function = function(e:Event):void {
				trace('playEvent');
				if(playing){
					player.Pause();
				} else {
					playing = player.Play(video);
					overButton.visible = !playing;
					image.visible = !playing;
				}
				nav.playButton.visible = !playing;
				nav.pauseButton.visible = playing;
			};
			overButton.addEventListener(MouseEvent.CLICK, playEvent);
			nav.playButton.addEventListener(MouseEvent.CLICK, playEvent);
			
			// AUTOPLAY
			if(autoplay) {
				//var clicker:Function = playEvent;
				playEvent(new MouseEvent(MouseEvent.CLICK));
			}
			
			//═ PAUSE ══════════════════════════════════════════════════════════════════════
			var pauseEvent:Function = function(e:Event):void {
				var isPause:Boolean = player.Pause();
				nav.playButton.visible = isPause;
				nav.pauseButton.visible = !isPause;
			};
			overlay.addEventListener(MouseEvent.CLICK, pauseEvent);
			nav.pauseButton.addEventListener(MouseEvent.CLICK, pauseEvent);
			//═ STOP ══════════════════════════════════════════════════════════════════════
			var stopEvent:Function = function(e:Event):void {
				trace('stopEvent');
				playing = false;
				//overButton.visible = !playing;
				nav.playButton.visible = !playing;
				nav.pauseButton.visible = playing;
				buffering.visible = playing;
				player.Stop();
			};
			//═ HIDE CONTROLS ═════════════════════════════════════════════════════════════
			var controlDisplayEvent:Function = function(e:Event):void {
				nav.visible = (e.type == 'mouseOver' && playing);
			};
			overlay.addEventListener(MouseEvent.MOUSE_OVER, controlDisplayEvent);
			overlay.addEventListener(MouseEvent.MOUSE_OUT, controlDisplayEvent);
			nav.addEventListener(MouseEvent.MOUSE_OVER, controlDisplayEvent);
			//nav.addEventListener(MouseEvent.MOUSE_OUT, controlDisplayEvent);
			//═ SEEK ══════════════════════════════════════════════════════════════════════
			var playingBarEvent:Function = function(e:MouseEvent):void {
				var point:Number = e.localX * info.playing;
				var seekpoint:Number = (point / 100) * info.duration;
				player.Seek(seekpoint);
				};
				nav.playingBar.buttonMode=true;
				nav.playingBar.addEventListener(MouseEvent.CLICK, playingBarEvent);
				var progressBarEvent:Function = function(e:MouseEvent):void {
				var point:Number = e.localX * info.progress;
				var seekpoint:Number = (point / 100) * info.duration;
				player.Log(point.toString());
				player.Log(info.progress.toString());
				player.Log(barwidth.toString());
				player.Seek(seekpoint);
			};
			nav.progressBar.buttonMode=true;
			nav.progressBar.addEventListener(MouseEvent.CLICK, progressBarEvent);
			var stageMouseMoveEvent:Function = function(event:MouseEvent):void { // for seeker position
				if(info.duration > 0 && seeking) {
				var point:int = (((nav.seeker.x - nav.progressBar.x) / barwidth) * info.duration) >> 0;
				if(point <= 0 || point >= (info.duration >> 0)) nav.seeker.stopDrag();
				nav.seeker.currentTime.text = formatTime(point);
				player.Seek(point);
				player.Log('stageMouseMoveEvent: '+point);
			}
			};
			var stageMouseUpEvent:Function = function(event:MouseEvent):void { // for stop seeking
				if(seeking){
					seeking = false;
					nav.seeker.stopDrag();
					player.Pause();
					player.Log('stageMouseUpEvent');
				}
			};
			var seekerEvent:Function = function(event:MouseEvent):void {
				if(!seeking){
					seeking = true;
					nav.seeker.startDrag(false, rectangle);
					player.Pause();
				}
			};
			nav.seeker.buttonMode=true;
			nav.seeker.addEventListener(MouseEvent.MOUSE_DOWN, seekerEvent);
			this.stage.addEventListener(MouseEvent.MOUSE_MOVE, stageMouseMoveEvent);
			this.stage.addEventListener(MouseEvent.MOUSE_UP, stageMouseUpEvent);


			//═ VOLUME ══════════════════════════════════════════════════════════════════════
			var setVolume:Function = function(newVolume:Number):void{
			player.Volume(newVolume);
			nav.volumeBar.mute.gotoAndStop((newVolume > 0)?1:2);
			nav.volumeBar.volumeOne.gotoAndStop((newVolume >= 0.2)?1:2);
			nav.volumeBar.volumeTwo.gotoAndStop((newVolume >= 0.4)?1:2);
			nav.volumeBar.volumeThree.gotoAndStop((newVolume >= 0.6)?1:2);
			nav.volumeBar.volumeFour.gotoAndStop((newVolume >= 0.8)?1:2);
			nav.volumeBar.volumeFive.gotoAndStop((newVolume == 1)?1:2);
			};
			var volumeEvent:Function = function(e:MouseEvent):void {
				if(e.buttonDown || e.type == 'click')
				switch (e.currentTarget) {
					case nav.volumeBar.mute : setVolume(0);break;
					case nav.volumeBar.volumeOne :   setVolume(.2);break;
					case nav.volumeBar.volumeTwo :   setVolume(.4);break;
					case nav.volumeBar.volumeThree : setVolume(.6);break;
					case nav.volumeBar.volumeFour :  setVolume(.8);break;
					case nav.volumeBar.volumeFive :  setVolume(1);break;
				}
			};
			nav.volumeBar.mute.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.mute.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			nav.volumeBar.volumeOne.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.volumeOne.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			nav.volumeBar.volumeTwo.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.volumeTwo.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			nav.volumeBar.volumeThree.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.volumeThree.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			nav.volumeBar.volumeFour.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.volumeFour.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			nav.volumeBar.volumeFive.addEventListener(MouseEvent.CLICK, volumeEvent);
			nav.volumeBar.volumeFive.addEventListener(MouseEvent.ROLL_OVER, volumeEvent);
			//═ FULLSCREEN ══════════════════════════════════════════════════════════════════════
			var fullscreenEvent:Function = function(e:Event):void {
				player.Fullscreen(stage);
			};
			nav.fullscreen.addEventListener(MouseEvent.CLICK, fullscreenEvent);

		}
		//═ POSE ══════════════════════════════════════════════════════════════════════
		public function pose(W:Number,H:Number):void {
			trace('Pose: '+W+'x'+H);
			background.x = screen.x = overlay.x = 0;
			background.y = screen.y = overlay.y = 0;
			background.width = overlay.width = W;
			background.height = overlay.height = H;
			overlay.alpha = 0;
			var proportion:Number = W / H;
			var videoproportion:Number = info.width / info.height;
			if(videoproportion >= proportion){ //<= (H / W)
				screen.width = W;
				screen.height = W / videoproportion;
			} else {
				screen.width = H * videoproportion;
				screen.height = H;
			}
			screen.x = (W - screen.width)*.5;
			screen.y = (H - screen.height)*.5;
			overButton.x = (W - overButton.width)*.5;
			overButton.y = (H - overButton.height)*.5;
			buffering.x = (W - buffering.width)*.5;
			buffering.y = (H - buffering.height)*.5;
			//NAVIGATOR
			nav.playButton.x=nav.pauseButton.x=padding;
			nav.pauseButton.y=nav.playButton.y;
			nav.bar.x=nav.playButton.width+padding*2;
			nav.container.x=nav.bar.x+padding;
			var barPadding = (nav.container.height - nav.playingBar.height)*.5;
			nav.progressBar.x=nav.playingBar.x=nav.container.x+barPadding;
			nav.progressBar.y=nav.playingBar.y=nav.container.y+barPadding;		
			if(!playing) nav.seeker.x = nav.container.x + barPadding;
			nav.seeker.y = nav.container.y - barPadding;
			rectangle = new Rectangle(nav.progressBar.x,nav.seeker.y,barwidth,0);			
			//nav.playingBar.width = 0;
			nav.y=H-nav.height-padding*.5;
			nav.bar.width=W-nav.bar.x-padding;
			var endPoint:int=nav.bar.x+nav.bar.width;
			if (fullscreen) {
				endPoint=nav.fullscreen.x=endPoint-nav.fullscreen.width-padding;
			} else {
				nav.fullscreen.visible=false;
			}
			endPoint = nav.volumeBar.x = endPoint - nav.volumeBar.width - padding;
			nav.container.width = endPoint-nav.container.x - padding;
			barwidth = nav.container.width - barPadding*2;
			nav.progressBar.width = nav.playingBar.width = barwidth;
			nav.progressBar.width = ((info.progress * barwidth *.01) >> 0);
		}

		private function formatTime(time:Number):String {
			if (time>0) {
				var integer:String = String((time/60)>>0);
				var decimal:String = String((time%60)>>0);
				return ((integer.length<2)?"0"+integer:integer)+":"+((decimal.length<2)?"0"+decimal:decimal);
			} else {
				return String("00:00");
			}

		}
	}
}