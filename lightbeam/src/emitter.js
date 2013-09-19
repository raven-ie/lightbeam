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
	lightbeam.emitter = function(instance, preset) {
		this.instance = instance;
		this.visible = (preset.visible !== undefined)?preset.visible:true;
		this.size = preset.size;
		this.shader = preset.shader;
		this.texture = preset.texture;
		this.bounding = {
			"sphere"	   : 0.0, //needed for frustum culling
			"sphereScaled" : 0.0  //scaled
		};
		this.position = preset.position || vec3.create();
		this.rotation = preset.rotation || vec3.create();
		this.angle = preset.angle 		|| vec3.create();
		this.scale = preset.scale 		|| vec3.clone([1.0, 1.0, 1.0]);
		//load point sprite texture (or increment texture counter)
		if(preset.texture) {
			if(preset.textures in instance.resources.textures) {
				++instance.resources.textures[preset.texture].count;
			}
			else {
				instance.resources.textures[preset.texture] = new lightbeam.texture(instance, preset.texture);
			}
		}
		//create "empty" particles
		var particles = this.particles = [],
			offset = preset.count;
		while(offset--) {
			particles[offset] = {
				"timeRemaining" : -1.0,
				"timeAll" : -1.0,
				"position" : null
			};
		}
		this.particlesGPU = new Float32Array(preset.count * 4); //xyz + w = timeRemaining / timeAll
		this.vbo = instance.gl.createBuffer();
		this.onUpdate = preset.onUpdate;
	};
	lightbeam.emitter.prototype = {
		"use" : function(deltaTime, last) {
			var currentShader = this.instance.resources.shaders[this.shader];
			if(this.onUpdate && currentShader &&
								currentShader.ready &&
								currentShader.particles) {
				this.onUpdate();
				var instance = this.instance,
					gl = instance.gl,
					modelViewMatrix = instance.matrix.modelView,
					radius = 0.0,
					particles = this.particles,
					particlesGPU = this.particlesGPU;
				//put data of all particles into array prepared for GPU
				for(var i = 0, length = particles.length; i < length; ++i) {
					var multiply = i * 4,
						particle = particles[i];
					particlesGPU[multiply] = particle.position[0];
					var scale = Math.max.apply(Math, this.scale);
					//calculate radius of bounding sphere (for frustum culling)
					if(particlesGPU[multiply] > radius) {
						radius = particlesGPU[multiply] * scale;
					}
					particlesGPU[multiply + 1] = particle.position[1];
					if(particlesGPU[multiply + 1] > radius) {
						radius = particlesGPU[multiply + 1] * scale;
					}
					particlesGPU[multiply + 2] = particle.position[2];
					if(particlesGPU[multiply + 2] > radius) {
						radius = particlesGPU[multiply + 2] * scale;
					}
					//update particle life expectancy
					particlesGPU[multiply + 3] = particle.timeRemaining / particle.timeAll;
				}
				if(this.bounding.sphere) {
					this.bounding.sphereScaled = this.bounding.sphere;
				}
				else {
					this.bounding.sphereScaled = radius * Math.max.apply(Math, this.scale);
				}
				if(this.visible) {
					//modelViewMatrix transforms
					instance.matrix.modelViewPush();
					mat4.translate(modelViewMatrix, modelViewMatrix, this.position);
					mat4.rotateX(modelViewMatrix, modelViewMatrix, this.angle[0]);
					mat4.rotateY(modelViewMatrix, modelViewMatrix, this.angle[1]);
					mat4.rotateZ(modelViewMatrix, modelViewMatrix, this.angle[2]);
					mat4.scale(modelViewMatrix, modelViewMatrix, this.scale);
					var speed = vec3.create();
					vec3.scale(speed, vec3.clone(this.rotation), deltaTime);
					vec3.add(this.angle, this.angle, speed);
					//decide to "use" current shader program (expensive)
					if(last[0] != this.shader) {
						if(currentShader.onBind) {
							currentShader.onBind();
						}
						gl.useProgram(currentShader.handle);
						gl.enableVertexAttribArray(currentShader.attributes[lightbeam.shader.locations.particleData]);
						gl.uniform1f(currentShader.uniforms[lightbeam.shader.locations.screenWidth], instance.matrix.viewport[2]);
						gl.uniformMatrix4fv(currentShader.uniforms[lightbeam.shader.locations.projectionMatrix], false, instance.matrix.projection);
						last[0] = this.shader;
					}
					else if(currentShader.onSkippedBind) {
						currentShader.onSkippedBind();
					}
					//decide to "bind" current texture (expensive)
					if(last[1] != this.texture) {
						gl.uniform1i(currentShader.uniforms[lightbeam.shader.locations.colorMap], 0);
						gl.activeTexture(gl.TEXTURE0);
						gl.bindTexture(gl.TEXTURE_2D, instance.resources.textures[this.texture].handle);
						last[1] = this.texture;
					}
					gl.uniform1f(currentShader.uniforms[lightbeam.shader.locations.particleSize], this.size);
					gl.uniformMatrix4fv(currentShader.uniforms[lightbeam.shader.locations.modelViewMatrix], false, modelViewMatrix);
					//fill vbo with new particles values
					gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
					gl.bufferData(gl.ARRAY_BUFFER, this.particlesGPU, gl.STATIC_DRAW);
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
					//draw all particles of this emitter in one call
					gl.vertexAttribPointer(currentShader.attributes[lightbeam.shader.locations.particleData], 4, gl.FLOAT, false, 0, 0);
					gl.drawArrays(gl.POINTS, 0, length);
					gl.bindBuffer(gl.ARRAY_BUFFER, null);
					gl.disable(gl.BLEND);
					instance.matrix.modelViewPop();
				}
			}
		},
		"clean" : function() {
			var instance = this.instance,
				texture = instance.resources.textures[this.texture];
			//decrement texture counter or remove particles texture
			if(texture && --texture.count == 0) {
				delete instance.resources.textures[this.texture];
			}
		}
	};
})();
