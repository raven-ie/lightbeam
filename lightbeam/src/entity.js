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
	lightbeam.entity = function(instance, preset) {
		this.instance = instance;
		this.visible = (preset.visible !== undefined)?preset.visible:true;
		this.shader = preset.shader;
		this.model = preset.model;
		this.modelPart = preset.modelPart; //filled only in nodes (normally)
		this.modelSource = preset.modelSource;
		this.lastModel = null;
		this.position = preset.position || vec3.create();
		this.globalPosition = vec3.create(); //used only in nodes
		this.rotation = preset.rotation || vec3.create();
		this.angle = preset.angle		|| vec3.create();
		this.scale = preset.scale		|| vec3.clone([1.0, 1.0, 1.0]);
		this.material = preset.material || {
			"textures"  : null, //default we will use texture of model part
			"ambient"	: [0.0, 0.0, 0.0],
			"diffuse"   : [1.0, 1.0, 1.0],
			"specular"  : [1.0, 1.0, 1.0],
			"shininess" : 100.0
		};
		//entity can have different collision shapes
		this.bounding = preset.bounding || {
			"sphere" 	   : 0.0, //basic shape, needed for frustum culling
			"sphereScaled" : 0.0  //scaled
		};
		this.nodes = {};
		this.onCreate = preset.onCreate;
		this.onUpdate = preset.onUpdate;
		this.onDestroy = preset.onDestroy;
	};
	lightbeam.entity.prototype = {
		"matrixTransform" : function(deltaTime) {
			var modelViewMatrix = this.instance.matrix.modelView;
			mat4.translate(modelViewMatrix, modelViewMatrix, this.position);
			mat4.rotateX(modelViewMatrix, modelViewMatrix, this.angle[0]);
			mat4.rotateY(modelViewMatrix, modelViewMatrix, this.angle[1]);
			mat4.rotateZ(modelViewMatrix, modelViewMatrix, this.angle[2]);
			mat4.scale(modelViewMatrix, modelViewMatrix, this.scale);
			var speed = vec3.create();
			vec3.scale(speed, vec3.clone(this.rotation), deltaTime);
			vec3.add(this.angle, this.angle, speed);
		},
		"prepareModel" : function() {
			var instance = this.instance;
			if(this.model in instance.resources.models) {
				var model = instance.resources.models[this.model];
				++model.count; if(model.ready) {
					this.lastModel = this.model;
					this.bounding.sphere = model.radius;
					//each entity node is like model part with own transform and actions
					for(var i in model.parts) {
						this.nodes[i] = new lightbeam.entity(instance, {
							"shader" 	 : this.shader,
							"model"  	 : this.model,
							"material"	 : this.material,
							"modelPart"  : i,
							"bounding"   : {
								"sphere" : model.parts[i].radius
							}
						});
					}
					if(this.onCreate) {
						this.onCreate();
					}
				}
			}
			else { //just dooo it if current model isn't loaded
				instance.resources.models[this.model] = new lightbeam.model(instance, this.model, this.modelSource);
			}
		},
		"use" : function(deltaTime, last, rootModelHandle, frustum) {
			if(this.onUpdate) {
				this.onUpdate();
			}
			var instance = this.instance;
			this.bounding.sphereScaled = this.bounding.sphere * Math.max.apply(Math, this.scale);
			//decide this is part of model or not
			if(!this.modelPart) {
				if(this.lastModel != this.model) { //so model is changed hmm..
					if(this.lastModel) { //we don't need last model anymore
						for(var i in this.nodes) {
							if(this.nodes[i].onDestroy) {
								this.nodes[i].onDestroy();
							}
						}
						this.nodes = {};
						this.clean(this.lastModel);
						this.lastModel = null;
					}
					else {
						this.prepareModel();
					}
				}
				else if(this.visible) {
					//root modelViewMatrix transforms
					instance.matrix.modelViewPush();
					this.matrixTransform(deltaTime);
					var nodes = this.nodes,
						rootModel = instance.resources.models[this.model];
					if(rootModel) {
						for(var i in nodes)	{
							//we need to make sure current part of the model (here single entity) is inside frustum
							var currentNode = nodes[i];
							vec3.add(currentNode.globalPosition, this.position, currentNode.position);
							if(frustum.sphere(currentNode.bounding.sphereScaled, currentNode.globalPosition)) {
								nodes[i].use(deltaTime, last, rootModel);
							}
						}
					}
					instance.matrix.modelViewPop();
				}
			}
			else if(this.visible) {
				//update shader (in some cases) and draw if it's model part
				var currentShader = instance.resources.shaders[this.shader];
				//use only "working" shader programs :)
				if(currentShader && currentShader.ready && !currentShader.particles) {
					//node modelViewMatrix transforms
					instance.matrix.modelViewPush();
					this.matrixTransform(deltaTime);
					var gl = instance.gl;
					//bind shader (program) if last isn't equal to current (avoid unnecessary binding)
					if(last[0] != this.shader) {
						if(currentShader.onBind) {
							currentShader.onBind();
						}
						gl.useProgram(currentShader.handle);
						gl.enableVertexAttribArray(currentShader.attributes[lightbeam.shader.locations.vertexPosition]);
						gl.enableVertexAttribArray(currentShader.attributes[lightbeam.shader.locations.vertexTexcoord]);
						//send uniforms needed for lighting if lighting is enabled
						if(currentShader.lighting || currentShader.complex) {
							gl.enableVertexAttribArray(currentShader.attributes[lightbeam.shader.locations.vertexNormal]);
							var lights = instance.lights;
							//ambient color
							if(lights.ambient) {
								gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.lightAmbient], lights.ambient);
							}
							//directional light
							if(lights.directional) {
								if(lights.directional.direction) {
									gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.lightDirection], lights.directional.direction);
								}
								if(lights.directional.diffuse) {
									gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.lightDiffuse], lights.directional.diffuse);
								}
								if(lights.directional.specular) {
									gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.lightSpecular], lights.directional.specular);
								}
							}
						}
						//send projection matrix
						gl.uniformMatrix4fv(currentShader.uniforms[lightbeam.shader.locations.projectionMatrix], false, instance.matrix.projection);
						last[0] = this.shader;
					}
					else if(currentShader.onSkippedBind) {
						currentShader.onSkippedBind();
					}
					var part = rootModelHandle.parts[this.modelPart];
					if(part) {
						if(currentShader.lighting || currentShader.complex) {
							//use material if defined
							var material = this.material;
							if(material) {
								//decide to "bind" texture of material or model part (expensive)
								if(material.textures 		  			 &&
								   material.textures.colorMap 			 &&
								   last[1] != material.textures.colorMap &&
								   material.textures.colorMap in instance.resources.textures) {
									gl.uniform1i(currentShader.uniforms[lightbeam.shader.locations.colorMap], 0);
									gl.activeTexture(gl.TEXTURE0);
									gl.bindTexture(gl.TEXTURE_2D, instance.resources.textures[material.textures.colorMap].handle);
									last[1] = material.textures.colorMap;
								}
								else if(part.textures && last[1] != part.textures.colorMap) {
									gl.uniform1i(currentShader.uniforms[lightbeam.shader.locations.colorMap], 0);
									gl.activeTexture(gl.TEXTURE0);
									gl.bindTexture(gl.TEXTURE_2D, instance.resources.textures[part.textures.colorMap].handle);
									last[1] = part.textures.colorMap;
								}
								gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.materialAmbient], material.ambient);
								gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.materialDiffuse], material.diffuse);
								gl.uniform3fv(currentShader.uniforms[lightbeam.shader.locations.materialSpecular], material.specular);
								gl.uniform1f(currentShader.uniforms[lightbeam.shader.locations.materialShininess], material.shininess);
							}
							//send normal matrix needed for lighting
							var normalMatrix = instance.matrix.normal = mat3.create();
							mat3.normalFromMat4(normalMatrix, instance.matrix.modelView);
							gl.uniformMatrix3fv(currentShader.uniforms[lightbeam.shader.locations.normalMatrix], false, normalMatrix);
						}
						else if(part.textures && last[1] != part.textures.colorMap) {
							gl.uniform1i(currentShader.uniforms[lightbeam.shader.locations.colorMap], 0);
							gl.activeTexture(gl.TEXTURE0);
							gl.bindTexture(gl.TEXTURE_2D, instance.resources.textures[part.textures.colorMap].handle);
							last[1] = part.textures.colorMap;
						}
						//send modelViewMatrix to GPU
						gl.uniformMatrix4fv(currentShader.uniforms[lightbeam.shader.locations.modelViewMatrix], false, instance.matrix.modelView);
						part.draw(currentShader);
					}
					instance.matrix.modelViewPop();
				}
			}
		},
		"clean" : function(lastModel) {
			//decide to remove current or previous model (remove entity or change his model)
			var instance = this.instance,
				model = instance.resources.models[lastModel || this.model];
			if(model && --model.count == 0) {
				model.clean();
				delete instance.resources.models[lastModel || this.model];
			}
		}
	};
})();
