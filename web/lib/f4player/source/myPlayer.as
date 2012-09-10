/*
╠═ f4.Player Sample ═══════════════════════════════════════════════════════
  Software: f4.Player - flash video player sample
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
	import f4.Player;
	import flash.display.MovieClip;
	import flash.display.StageAlign;
    import flash.display.StageScaleMode;
    import flash.display.Loader;
	import flash.events.Event;
	import flash.events.ContextMenuEvent;
	import flash.net.URLRequest;
	import flash.net.navigateToURL;
	import flash.ui.ContextMenu;
	import flash.ui.ContextMenuItem;
	import flash.external.ExternalInterface;
	public class myPlayer extends MovieClip {
		public function myPlayer() {
			stage.scaleMode = StageScaleMode.NO_SCALE;
			stage.align     = StageAlign.TOP_LEFT;
			var stream      = this.loaderInfo.parameters.stream;
			var streamname  = this.loaderInfo.parameters.streamname;
			var live        = this.loaderInfo.parameters.live == 1;
			var subscribe   = this.loaderInfo.parameters.subscribe == 1;
			var video       = this.loaderInfo.parameters.video;
			var thumbnail   = this.loaderInfo.parameters.thumbnail;
			var skinfile    = this.loaderInfo.parameters.skin;
			var autoplay    = this.loaderInfo.parameters.autoplay == 1;
			var fullscreen  = this.loaderInfo.parameters.fullscreen;
			var skin;
			var skinEvent:Function = function(e:Event):void {
				skin = e.currentTarget.content;
				stage.addChild(skin);
				ExternalInterface.call("console.log",'initializating ...');
				ExternalInterface.call("stream",stream);
				skin.initialization(
						new Player(
								   //'rtmp://fml.45FB.edgecastcdn.net/2045FB/skyturkcanli'
								   stream
								   //,'skyturk'
								   ,streamname
								   //,true
								   ,live
								   //,true
								   ,subscribe
								   ),
						stage.stageWidth,
						stage.stageHeight,
						video
						//'data/video.flv'
						,thumbnail ? thumbnail : null//'data/thumbnail.jpg'
						,autoplay
						,fullscreen
						);
			}
			var sl = new Loader();
			sl.contentLoaderInfo.addEventListener(Event.COMPLETE, skinEvent);
			sl.load(new URLRequest(skinfile ? skinfile : 'skins/mySkin.swf'));
			// Resize Event
			var resizeEvent:Function = function(e:Event):void {
				skin.pose(stage.stageWidth,stage.stageHeight);
				ExternalInterface.call("console.log",(stage.stageWidth.toString()+'x'+stage.stageHeight.toString()));
			}
			stage.addEventListener(Event.RESIZE, resizeEvent);
			stage.addEventListener(Event.FULLSCREEN, resizeEvent);
			// CUSTOMIZE RIGHT CLICK CONTEXT MENU
			var menu:ContextMenu = new ContextMenu();
			menu.hideBuiltInItems();
			var signature = new ContextMenuItem("f4Player");
			function openLink(e:ContextMenuEvent):void{
				navigateToURL(new URLRequest("http://gokercebeci.com/dev/f4player/?feature=player"));
			}
			signature.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, openLink);
			menu.customItems.push(signature);
			contextMenu = menu;
		}		
	}
}