/*
╠═ f4.PlayerInterface ════════════════════════════════════════════════════
  Software: f4.PlayerInterface - flash video player interfece
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
package f4 {
	import flash.display.MovieClip;
	import flash.display.Stage;
	import flash.display.Bitmap;
	import flash.media.Video;
	public interface PlayerInterface {
		function Callback(callback:Function):void;
		function Movie(w:int,h:int):Video;
		function Play(file:String):Boolean;
		function Pause():Boolean;
		function Stop():void;
		function Volume(vol:Number);
		function Mute():int;
		function Fullscreen(stage:Stage):Boolean;
		function Seek(point:int):int;
		function Thumbnail(image:String,w:int,h:int):MovieClip;
		function Next():void;
		function Prev():void;
		function Subtitle(sub:String):void;
		function Log(log:String):void;
	}
}
