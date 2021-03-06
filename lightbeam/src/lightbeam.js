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
	var lightbeam = window.lightbeam = function(gl) {
		//webgl context
		this.gl = gl;
		//state of renderer
		this.state = {
			"running" : true
		};
		//timing
		this.time = {
			"last"  : 0,
			"delta" : 0.0 //FPS = 1 / deltaTime
		};
		//transform matrices
		var matrix = this.matrix = {
			"viewport"		 : null,
			"view"			 : mat4.create(),
			"modelView" 	 : mat4.create(),
			"modelViewStack" : [],
			"modelViewPush"  : function() {
				var copy = mat4.create();
				mat4.copy(copy, matrix.modelView);
				matrix.modelViewStack.push(copy);
			},
			"modelViewPop" 	 : function() {
				matrix.modelView = matrix.modelViewStack.pop();
			},
			"projection" 	 : mat4.create(),
			"normal" 		 : null
		};
		//basic lighting
		this.lights = {
			"ambient" : [0.0, 0.0, 0.0],
			"directional" : {
				"direction" : [0.0, 0.0, 1.0],
				"diffuse"   : [1.0, 1.0, 1.0],
				"specular"  : [1.0, 1.0, 1.0]
			}
		};
		//engine resources containers
		//some objects have "ready" variable
		var resources = this.resources = {
			"shaders"  : {},
			"textures" : {},
			"models"   : {},
			"loaded"   : function() {
				var count = 0,
					shaders = resources.shaders,
					textures = resources.textures,
					models = resources.models;
				for(var i in shaders) {
					if(shaders[i].ready) {
						++count;
					}
				}
				for(var i in textures) {
					if(textures[i].ready) {
						++count;
					}
				}
				for(var i in models) {
					if(models[i].ready) {
						++count;
					}
				}
				return count;
			},
			"count"	   : function() {
				return Object.keys(resources.shaders).length  +
					   Object.keys(resources.textures).length +
					   Object.keys(resources.models).length;
			}
		};
		//engine objects containers
		this.objects = {
			"visible"  			    : 0,
			"count"    			    : 0,
			"cameras"  			    : {},
			"emitters" 			    : {},
			"entities" 			    : {},
			"entitiesInsideFrustum" : {}
		};
		this.activeCamera = null;
		this.frustum = new lightbeam.frustum(this.matrix);
		this.onUpdate = null;
	};
	lightbeam.prototype = {
		get activeCamera() {
			return this._activeCamera;
		},
		set activeCamera(value) {
			this._activeCamera = (value in this.objects.cameras)?value:null;
		},
		"createShader" : function(ID, vertex, fragment, type) {
			this.resources.shaders[ID] = new lightbeam.shader(this, ID, vertex, fragment, type);
			return this.resources.shaders[ID];
		},
		"catchShader" : function(ID) {
			return this.resources.shaders[ID];
		},
		"destroyShader" : function(ID) {
			delete this.resources.shaders[ID];
		},
		"createCameraFirstPerson" : function(ID, isActive) {
			this.objects.cameras[ID] = new lightbeam.camera(this.matrix);
			if(isActive) {
				this.activeCamera = ID;
			}
			return this.objects.cameras[ID];
		},
		"createCameraThirdPerson" : function(ID, followedID, isActive) {
			this.objects.cameras[ID] = new lightbeam.camera(this.matrix, followedID, this.objects.entities);
			if(isActive) {
				this.activeCamera = ID;
			}
			return this.objects.cameras[ID];
		},
		"catchCamera" : function(ID) {
			return this.objects.cameras[ID];
		},
		"destroyCamera" : function(ID) {
			this.activeCamera = ID;
			delete this.objects.cameras[ID];
		},
		"destroyEveryCamera" : function() {
			this.activeCamera = null;
			this.objects.cameras = {};
		},
		"createEmitter" : function(ID, preset) {
			if(preset != null) {
				++this.objects.count;
				this.objects.emitters[ID] = new lightbeam.emitter(this, preset);
				return this.objects.emitters[ID];
			}
		},
		"catchEmitter" : function(ID) {
			return this.objects.emitters[ID];
		},
		"destroyEmitter" : function(ID) {
			if(ID in this.objects.emitters) {
				--this.objects.count;
				this.objects.emitters[ID].clean();
				delete this.objects.emitters[ID];
			}
		},
		"createEntity" : function(ID, preset) {
			++this.objects.count;
			this.objects.entities[ID] = new lightbeam.entity(this, preset);
			return this.objects.entities[ID];
		},
		"catchEntity" : function(ID) {
			return this.objects.entities[ID];
		},
		"destroyEntity" : function(ID) {
			if(ID in this.objects.entities) {
				--this.objects.count;
				var entity = this.objects.entities[ID];
				if(entity.onDestroy) {
					entity.onDestroy();
				}
				entity.clean();
				delete this.objects.entities[ID];
			}
		},
		"destroyObjectsAndResources" : function() {
			this.objects.visible = 0;
			this.objects.count = 0;
			this.objects.emitters = {};
			this.objects.entities = {};
			//clean because resources have handles to data inside GPU memory
			var models = this.resources.models;
			for(var i in models) {
				models[i].clean();
			}
			this.resources.textures = {};
			this.resources.models = {};
		},
		"clear" : function() {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		},
		//run this piece of shit
		"frame" : function() {
			var gl = this.gl;
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			//calculate delta time (variable time step) for smooth animation
			var currentTime = new Date().getTime();
			if(this.time.last != 0) {
				this.time.delta = (currentTime - this.time.last) / 1000.0;
			}
			this.time.last = currentTime;
			if(this.onUpdate) {
				this.onUpdate();
			}
			entitiesInsideFrustum = {};
			if(this.activeCamera) {
				this.objects.visible = 0;
				var last = [null, null],
					deltaTime = this.time.delta,
					frustum = this.frustum,
					emitters = this.objects.emitters,
					entities = this.objects.entities,
					entitiesInsideFrustum = this.objects.entitiesInsideFrustum,
					camera = this.objects.cameras[this.activeCamera];
				camera.use(deltaTime);
				frustum.calculate();
				//loop through emitters and entities and draw only visible ones
				for(var i in emitters) {
					var currentEmitter = emitters[i];
					if(frustum.sphere(currentEmitter.bounding.sphereScaled, currentEmitter.position)) {
						++this.objects.visible;
						currentEmitter.use(deltaTime, last);
					}
				}
				for(var i in entities) {
					var currentEntity = entities[i];
					if(frustum.sphere(currentEntity.bounding.sphereScaled, currentEntity.position)) {
						++this.objects.visible;
						entitiesInsideFrustum[i] = currentEntity;
						currentEntity.use(deltaTime, last, null, frustum);
					}
				}
			}
			//request next frame if we know engine is running
			if(this.state.running) {
				requestAnimationFrame(this.frame.bind(this));
			}
		}
	};
	lightbeam.createRenderer = function(canvasID) {
		var canvas = document.getElementById(canvasID);
		var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		if(gl) {
			var that = new lightbeam(gl);
			mat4.perspective(that.matrix.projection, 45.0, canvas.width / canvas.height, 0.1, 100.0);
			gl.viewport(0, 0, canvas.width, canvas.height);
			that.matrix.viewport = [0, 0, canvas.width, canvas.height];
			gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.CULL_FACE);
			return that;
		}
	};
})();
