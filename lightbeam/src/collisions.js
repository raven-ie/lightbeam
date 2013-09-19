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
	lightbeam.unproject = function(coord, matrix) {
		var result = mat4.create();
		mat4.multiply(result, mat4.clone(matrix.projection), mat4.clone(matrix.view));
		var inverseMatrix = mat4.create();
		if(!mat4.invert(inverseMatrix, result)) {
			return null;
		}
		var world = vec4.create();
		vec4.transformMat4(world, [coord[0], coord[1], -1.0, 1.0], inverseMatrix);
		if(world[3] === 0.0) {
			return null;
		}
		vec4.scale(world, world, 1.0 / world[3]);
		var origin = vec4.create();
		vec4.transformMat4(origin, [coord[0], coord[1], 0.1, 1.0], inverseMatrix);
		if(origin[3] === 0.0) {
			return null;
		}
		vec4.scale(origin, origin, 1.0 / origin[3]);
		var direction = vec3.create();
		vec3.subtract(direction, origin, world);
		vec3.normalize(direction, direction);
		return [origin, direction];
	};
	lightbeam.collisions = {
		//check intersection between ray and bounding sphere
		//r, cr - sphere radius, center
		//return distance from start point of ray (origin) to sphere center
		"raySphere" : function(ray, r, cr) {
			var origin = ray[0],
				direction = ray[1],
				subtract = vec3.create();
			vec3.subtract(subtract, origin, cr);
			var a = vec3.dot(direction, direction),
				b = 2.0 * vec3.dot(direction, subtract),
				c = vec3.dot(cr, cr) + vec3.dot(origin, origin) -
					2.0 * vec3.dot(cr, origin) - r * r;
			if(b * b - 4.0 * a * c >= 0.0) {
				return vec3.distance(origin, cr);
			}
		},
		//check intersection between two spheres
		//r1, cr1 - first sphere radius, center
		//r2, cr2 - second sphere radius, center
		//return distance between centers of spheres if there is not intersection
		//else return true
		"sphereSphere" : function(r1, cr1, r2, cr2) {
			var r = r1 + r2,
				distance = vec3.squaredDistance(cr1, cr2);
			if(distance > r * r) {
				return distance;
			}
			return true;
		},
		//check intersection between entity and spheres located in array (bounding spheres of entities)
		//entity - first bounding sphere
		//objects - array of spheres
		"collider" : function(entity, objects) {
			var r = entity.bounding.sphereScaled,
				cr = entity.position,
				offset = objects.length;
			while(offset--) {
				if(entity !== objects[offset]   &&
				   entity.visible 				&&
				   objects[offset].visible		&&
				   lightbeam.collisions.sphereSphere(r, cr,
				   									 objects[offset].bounding.sphereScaled,
				   									 objects[offset].position) == true) {
					return [objects[offset], offset];
				}
			}
		},
		//ray intersections returns the closest match
		//objects - entities with bounding spheres
		"ray" : function(coord, matrix, objects) {
			var ray = lightbeam.unproject(coord, matrix),
				results = [],
				offset = objects.length;
			while(offset--) {
				var entity = objects[offset];
				var distance = lightbeam.collisions.raySphere(ray,
															  entity.bounding.sphereScaled,
															  entity.position);
				if(distance) {
					results.push([entity, distance]);
				}
			}
			if(results.length != 0) {
				//sort the results (we need only nearest bounding sphere)
				var lastIndex = 0,
					lastDistance = Infinity;
				offset = results.length;
				while(offset--) {
					if(lastDistance > results[offset][1]) {
						lastIndex = offset;
						lastDistance = results[offset][1];
					}
				}
				return results[lastIndex][0];
			}
		}
	};
})();
