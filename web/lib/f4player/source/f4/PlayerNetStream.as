/*
╠═ f4.PlayerNetStream ════════════════════════════════════════════════════
  Software: f4.PlayerNetStream - flash video player custom netstream class
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
    import flash.net.NetConnection;
    import flash.net.NetStream;
     public dynamic class PlayerNetStream extends NetStream {
        public function PlayerNetStream(nc:NetConnection) {
            super(nc);
        }
    }
}