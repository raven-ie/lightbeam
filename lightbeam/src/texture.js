/*
	Copyright 2013 Robert "Mist" Nowak
	
	This file is part of lightbeam.

    lightbeam is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    lightbeam is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with lightbeam; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
(function() {
	"use strict";
	var lightbeam = window.lightbeam;
	lightbeam.texture = function(instance, path, filtering) {
		this.instance = instance;
		this.ready = false;
		this.count = 1;
		this.reload(path, filtering);
	};
	lightbeam.texture.prototype = {
		"reload" : function(path, filtering) {
			this.filtering = filtering || this.filtering;
			var gl = this.instance.gl,
				image = new Image(),
				that = this;
			if(this.handle) { //isn't first image load? CLEAR
				gl.deleteTexture(this.handle);
			}
			//callback evoked on image load
			image.onload = function () {
				that.ready = true;
				//image data transferring into GPU memory
				that.handle = gl.createTexture(); //WEBGL HANDLE
				gl.bindTexture(gl.TEXTURE_2D, that.handle);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				//set texture format to RGBA if extension is equal to "png"
				if(path.substr(path.length - 3, 3) == "png") {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
				}
				else {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
				}
				switch(that.filtering) {
					case 0: {  //low
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						break;
					}
					case 1: {  //medium
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
						gl.generateMipmap(gl.TEXTURE_2D);
						break;
					}
					case 2: {  //high
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
						gl.generateMipmap(gl.TEXTURE_2D);
						break;
					}
					default: { //default high
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
						gl.generateMipmap(gl.TEXTURE_2D);
					}
				}
				gl.bindTexture(gl.TEXTURE_2D, null);
			};
			image.src = path;
		}
	};
	lightbeam.texture.detail = {
		"low" 	 : 1,
		"medium" : 2,
		"high" 	 : 3
	};
})();
