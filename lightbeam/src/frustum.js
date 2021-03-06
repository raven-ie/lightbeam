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
	lightbeam.frustum = function(matrix) {
		this.matrix = matrix;
		this.plane = [[], [], [], [], [], []]; //frustum plane matrix
	};
	lightbeam.frustum.prototype = {
		"calculate" : function() {
			var plane = this.plane,
				matrix = mat4.create();
			//calculate plane using projection and view matrices
			mat4.multiply(matrix, this.matrix.projection, this.matrix.view);
			plane[0][0] = matrix[3] - matrix[0];
			plane[0][1] = matrix[7] - matrix[4];
			plane[0][2] = matrix[11] - matrix[8];
			plane[0][3] = matrix[15] - matrix[12];
			var length = Math.sqrt(plane[0][0] * plane[0][0] +
								   plane[0][1] * plane[0][1] +
								   plane[0][2] * plane[0][2]);
			plane[0][0] /= length; plane[0][1] /= length;
			plane[0][2] /= length; plane[0][3] /= length;
			plane[1][0] = matrix[3] - matrix[0];
			plane[1][1] = matrix[7] - matrix[4];
			plane[1][2] = matrix[11] - matrix[8];
			plane[1][3] = matrix[15] - matrix[12];
			length = Math.sqrt(plane[1][0] * plane[1][0] +
							   plane[1][1] * plane[1][1] +
							   plane[1][2] * plane[1][2]);
			plane[1][0] /= length; plane[1][1] /= length;
			plane[1][2] /= length; plane[1][3] /= length;
			plane[2][0] = matrix[3] - matrix[1];
			plane[2][1] = matrix[7] - matrix[5];
			plane[2][2] = matrix[11] - matrix[9];
			plane[2][3] = matrix[15] - matrix[13];
			length = Math.sqrt(plane[2][0] * plane[2][0] +
							   plane[2][1] * plane[2][1] +
							   plane[2][2] * plane[2][2]);
			plane[2][0] /= length; plane[2][1] /= length;
			plane[2][2] /= length; plane[2][3] /= length;
			plane[3][0] = matrix[3] - matrix[1];
			plane[3][1] = matrix[7] - matrix[5];
			plane[3][2] = matrix[11] - matrix[9];
			plane[3][3] = matrix[15] - matrix[13];
			length = Math.sqrt(plane[3][0] * plane[3][0] +
							   plane[3][1] * plane[3][1] +
							   plane[3][2] * plane[3][2]);
			plane[3][0] /= length; plane[3][1] /= length;
			plane[3][2] /= length; plane[3][3] /= length;
			plane[4][0] = matrix[3] - matrix[2];
			plane[4][1] = matrix[7] - matrix[6];
			plane[4][2] = matrix[11] - matrix[10];
			plane[4][3] = matrix[15] - matrix[14];
			length = Math.sqrt(plane[4][0] * plane[4][0] +
							   plane[4][1] * plane[4][1] +
							   plane[4][2] * plane[4][2]);
			plane[4][0] /= length; plane[4][1] /= length;
			plane[4][2] /= length; plane[4][3] /= length;
			plane[5][0] = matrix[3] - matrix[2];
			plane[5][1] = matrix[7] - matrix[6];
			plane[5][2] = matrix[11] - matrix[10];
			plane[5][3] = matrix[15] - matrix[14];
			length = Math.sqrt(plane[5][0] * plane[5][0] +
							   plane[5][1] * plane[5][1] +
							   plane[5][2] * plane[5][2]);
			plane[5][0] /= length; plane[5][1] /= length;
			plane[5][2] /= length; plane[5][3] /= length;
			return true;
		},
		"sphere" : function(radius, center) {
			var plane = this.plane, p = 6;
			while(p--) {
				var distance = plane[p][0] * center[0] +
							   plane[p][1] * center[1] +
							   plane[p][2] * center[2] +
							   plane[p][3];
				if(distance < -radius) {
					return false;
				}
			}
			//return distance + radius (good for selecting level of details)
			return true;
		}
	};
})();
