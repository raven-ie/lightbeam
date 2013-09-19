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
	lightbeam.model = function(instance, path, source) {
		this.count = 0;
		this.radius = 0.0; //entity will load this variable into own property
		this.parts = {};
		if(path.indexOf(".mesh", path.length - 5) === -1) {
			this.ready = true;
			this.process(instance, source);
		}
		else {
			var that = this,
				request = new XMLHttpRequest();
			request.open("GET", path, true);
			request.onreadystatechange = function() {
				if(request.readyState == 4) {
					var model = JSON.parse(request.responseText);
					that.process(instance, model);
					that.ready = true;
				}
			};
			request.send();
		}
	};
	lightbeam.model.prototype = {
		"process" : function(instance, model) {
			//model is group of "parts" with single material and geometry
			for(var i in model) {
				/*
					MODEL FORMAT
					{
						"singleObjectID" : {
							"vertices" 	 : [],
							"normals" 	 : [],
							"texcoords"  : [],
							"indices" 	 : [],
							"textures" 	 : {
								"colorMap" : "name.jpg" //"name.jpg" is also texture ID
							}
						}
						...
					}
				*/
				var currentModel = model[i];
				this.parts[i] = new lightbeam.model.part(instance,
														 currentModel.textures,
														 currentModel.vertices,
														 currentModel.normals,
														 currentModel.texcoords,
														 currentModel.indices);
				//searching for biggest position of vertices
				//calculating radius of bounding sphere
				var vertices = currentModel.vertices,
					m = -Infinity, k = 0, n = vertices.length;
				for(; k != n; ++k) {
					if(vertices[k] > m) {
						m = vertices[k];
					}
				}
				this.parts[i].radius = m;
				if(m > this.radius) {
					this.radius = m;
				}
			}
		},
		"clean" : function() {
			var parts = this.parts;
			for(var i in parts) {
				parts[i].clean();
			}
		}
	};
	lightbeam.model.part = function(instance, textures, vertices, normals, texcoords, indices) {
		this.instance = instance;
		/*
			SUPPORTED TEXTURES
			{
				"colorMap" : "name.jpg"/"name.png"
			}
		*/
		this.textures = textures;
		//used when entity nodes are created basing on parts of model
		//it's same like radius in model
		this.radius = 0.0;
		this.vbo = {};
		var gl = instance.gl;
		//we won't waste time for "empty" geometry
		if(vertices) {
			if(textures && textures.colorMap) {
				if(textures.colorMap in instance.resources.textures) {
					++instance.resources.textures[textures.colorMap].count;
				}
				else {
					instance.resources.textures[textures.colorMap] = new lightbeam.texture(instance, textures.colorMap);
				}
				//in future here lightbeam will load other textures of model part (light, specular, normal and other maps)
			}
			//build vbo for vertices, normals, texcoords and indices
			this.vbo.vertices = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.vertices);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			if(normals) {
				this.vbo.normals = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.normals);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
			}
			if(texcoords) {
				this.vbo.texcoords = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.texcoords);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
			}
			if(indices) {
				this.vbo.indices = gl.createBuffer();
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo.indices);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
				this.vbo.length = indices.length;
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}
	};
	lightbeam.model.part.prototype = {
		"draw" : function(shader) {
			if(this.vbo.vertices) {
				var gl = this.instance.gl;
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.vertices);
				gl.vertexAttribPointer(shader.attributes[lightbeam.shader.locations.vertexPosition], 3, gl.FLOAT, false, 0, 0);
				if(this.vbo.normals && shader.lighting || shader.complex) {
					gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.normals);
					gl.vertexAttribPointer(shader.attributes[lightbeam.shader.locations.vertexNormal], 3, gl.FLOAT, false, 0, 0);
				}
				if(this.vbo.texcoords && !shader.lighting) {
					gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.texcoords);
					gl.vertexAttribPointer(shader.attributes[lightbeam.shader.locations.vertexTexcoord], 2, gl.FLOAT, false, 0, 0);
				}
				if(this.vbo.indices) {
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo.indices);
					gl.drawElements(gl.TRIANGLES, this.vbo.length, gl.UNSIGNED_SHORT, 0);
				}
				gl.bindBuffer(gl.ARRAY_BUFFER, null);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			}
		},
		"clean" : function() {
			if(this.textures && this.textures.colorMap) {
				//remove texture or decrement his counter
				var instance = this.instance,
					texture = instance.resources.textures[this.textures.colorMap];
				if(texture && --texture.count == 0) {
					delete instance.resources.textures[this.textures.colorMap];
				}
			}
		}
	};
})();
