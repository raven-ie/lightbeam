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
	lightbeam.camera = function(matrix, followed, entities) {
		this.matrix = matrix;
		this.position = vec3.create();
		this.rotation = vec3.create();
		this.angle = vec3.create();
		this.scale = vec3.clone([1.0, 1.0, 1.0]);
		this.onUpdate = null;
		/*
			ONLY FOR TPP CAMERA
		*/
		if(followed || followed == null) {
			//ID of the tracked entity (or set to null do not follow)
			this.followed = followed;
			this.entities = entities;
			this.distance = {
				"flank" : 0.0,
				"top"   : 0.0,
				"back"  : 1.0,
			};
		}
	};
	lightbeam.camera.prototype = {
		"use" : function(deltaTime) {
			var viewMatrix = this.matrix.view;
			mat4.identity(viewMatrix);
			if(this.onUpdate) {
				this.onUpdate();
			}
			//tpp
			if(this.distance) {
				if(this.followed) {
					mat4.translate(viewMatrix, viewMatrix, [-this.distance.flank, -this.distance.top, -this.distance.back]);
					mat4.rotateX(viewMatrix, viewMatrix, this.angle[0]);
					mat4.rotateY(viewMatrix, viewMatrix, this.angle[1]);
					mat4.rotateZ(viewMatrix, viewMatrix, this.angle[2]);
					var position = this.entities[this.followed].position;
					mat4.translate(viewMatrix, viewMatrix, [-position[0], -position[1], -position[2]]);
				}
				//tpp (not tracking)
				else {
					mat4.translate(viewMatrix, viewMatrix, [-this.distance.flank, -this.distance.top, -this.distance.back]);
					mat4.rotateX(viewMatrix, viewMatrix, this.angle[0]);
					mat4.rotateY(viewMatrix, viewMatrix, this.angle[1]);
					mat4.rotateZ(viewMatrix, viewMatrix, this.angle[2]);
					mat4.translate(viewMatrix, viewMatrix, [-this.position[0], -this.position[1], -this.position[2]]);
				}
			}
			//fpp
			else {
				mat4.rotateX(viewMatrix, viewMatrix, this.angle[0]);
				mat4.rotateY(viewMatrix, viewMatrix, this.angle[1]);
				mat4.rotateZ(viewMatrix, viewMatrix, this.angle[2]);
				mat4.translate(viewMatrix, viewMatrix, this.position);
				mat4.scale(viewMatrix, viewMatrix, this.scale);
			}
			var speed = vec3.create();
			vec3.scale(speed, vec3.clone(this.rotation), deltaTime);
			vec3.add(this.angle, this.angle, speed);
			mat4.copy(this.matrix.modelView, viewMatrix);
		}
	};
})();
