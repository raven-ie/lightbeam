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
	lightbeam.shader = function(instance, id, vertexSource, fragmentSource, type) {
		this.ready = true;
		this.handle = instance.gl.createProgram();
		this.attributes = {};
		this.uniforms = {};
		this.onBind = null;
		this.onSkippedBind = null;
		//push build-in locations into sources of both shaders
		var gl = instance.gl,
			handle = this.handle,
			locations = lightbeam.shader.locations;
		switch(type) {
			case 0: { //simple
				this.simple = true;
				vertexSource = "attribute vec3 " + locations.vertexPosition + ";"  +
							   "attribute vec2 " + locations.vertexTexcoord + ";"  +
							   "uniform mat4 " + locations.modelViewMatrix + ";"   +
							   "uniform mat4 " + locations.projectionMatrix + ";"  +
							    vertexSource;
				fragmentSource = "precision mediump float;" 					   +
								 "uniform sampler2D " + locations.colorMap + ";"   +
								  fragmentSource;
				break;
			}
			case 1: { //basic lighting
				this.lighting = true;
				vertexSource = "attribute vec3 " + locations.vertexPosition + ";" +
							   "attribute vec3 " + locations.vertexNormal + ";"   +
							   "uniform mat4 " + locations.modelViewMatrix + ";"  +
							   "uniform mat4 " + locations.projectionMatrix + ";" +
							   "uniform mat3 " + locations.normalMatrix + ";"	  +
							    vertexSource;
				fragmentSource = "precision mediump float;"							  +
								 "uniform vec3 " + locations.lightAmbient + ";"		  +
								 "uniform vec3 " + locations.lightDirection + ";"	  +
								 "uniform vec3 " + locations.lightDiffuse + ";"  	  +
								 "uniform vec3 " + locations.lightSpecular + ";"  	  +
								 "uniform vec3 " + locations.materialAmbient + ";"	  +
								 "uniform vec3 " + locations.materialDiffuse + ";"	  +
								 "uniform vec3 " + locations.materialSpecular + ";"	  +
								 "uniform float " + locations.materialShininess + ";" +
								  fragmentSource;
				break;
			}
			case 2: { //simple + basic lighting
				this.complex = true;
				vertexSource = "attribute vec3 " + locations.vertexPosition + ";" +
							   "attribute vec3 " + locations.vertexNormal + ";"   +
							   "attribute vec2 " + locations.vertexTexcoord + ";" +
							   "uniform mat4 " + locations.modelViewMatrix + ";"  +
							   "uniform mat4 " + locations.projectionMatrix + ";" +
							   "uniform mat3 " + locations.normalMatrix + ";"	  +
							    vertexSource;
				fragmentSource = "precision mediump float;"							  +
								 "uniform vec3 " + locations.lightAmbient + ";"		  +
								 "uniform vec3 " + locations.lightDirection + ";"	  +
								 "uniform vec3 " + locations.lightDiffuse + ";"  	  +
								 "uniform vec3 " + locations.lightSpecular + ";"  	  +
								 "uniform vec3 " + locations.materialAmbient + ";"	  +
								 "uniform vec3 " + locations.materialDiffuse + ";"	  +
								 "uniform vec3 " + locations.materialSpecular + ";"	  +
								 "uniform float " + locations.materialShininess + ";" +
								 "uniform sampler2D " + locations.colorMap + ";" 	  +
								  fragmentSource;
				break;
			}
			case 3: { //point sprites for particles
				this.particles = true;
				vertexSource = "attribute vec4 " + locations.particleData + ";"   +
							   "uniform mat4 " + locations.modelViewMatrix + ";"  +
							   "uniform mat4 " + locations.projectionMatrix + ";" +
							   "uniform float " + locations.screenWidth + ";"	  +
							   "uniform float " + locations.particleSize + ";"	  +
							    vertexSource;
				fragmentSource = "precision mediump float;"					  	  +
								 "uniform sampler2D " + locations.colorMap + ";"  +
								  fragmentSource;
			}
		}
		//compile vertex shader and check for errors
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vertexSource);
		gl.compileShader(vertexShader);
		if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			this.ready = false;
			alert("shader : " + id + " : " + gl.getShaderInfoLog(vertexShader));
		}
		//compile fragment shader and check for errors
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fragmentSource);
		gl.compileShader(fragmentShader);
		if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			this.ready = false;
			alert("shader : " + id + " : " + gl.getShaderInfoLog(fragmentShader));
		}
		//create and link shader program then check for errors
		gl.attachShader(handle, vertexShader);
		gl.attachShader(handle, fragmentShader);
		gl.linkProgram(handle);
		if(!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
			this.ready = false;
			alert("shader : " + id + " : linking failed");
		}
		else {
			gl.useProgram(handle);
			//intelli attributes and uniforms searching
			var variablesSpace = vertexSource.substring(0, vertexSource.indexOf("void")) +
								 fragmentSource.substring(0, fragmentSource.indexOf("void"));
			variablesSpace = variablesSpace.replace(/;/g, " ");
			variablesSpace = variablesSpace.split(" ");
			var length = variablesSpace.length;
			for(var i = 0; i < length; ++i) {
				if(variablesSpace[i] == "attribute") {
					i += 2; this.attributes[variablesSpace[i]] = gl.getAttribLocation(handle, variablesSpace[i]);
				}
				else if(variablesSpace[i] == "uniform") {
					i += 2; this.uniforms[variablesSpace[i]] = gl.getUniformLocation(handle, variablesSpace[i]);
				}
			}
			gl.useProgram(null);
		}
	};
	//each shader program have own type
	lightbeam.shader.type = {
		"simple"    : 0,
		"lighting"  : 1,
		"complex"   : 2, // = simple + lighting
		"particles" : 3
	};
	//engine will use these values automatically during rendering
	//all of them are also added automatically into shaders
	//don't change any key if you aren't advanced user
	lightbeam.shader.locations = {
		//vertex
		"vertexPosition" : "vertexPosition",
		"vertexNormal"   : "vertexNormal",
		"vertexTexcoord" : "vertexTexcoord",
		//matrix
		"modelViewMatrix"  : "modelViewMatrix",
		"projectionMatrix" : "projectionMatrix",
		"normalMatrix"     : "normalMatrix",
		//light
		"lightAmbient"   : "lightAmbient",   //ambient color
		"lightDirection" : "lightDirection", //directional light direction
		"lightDiffuse"   : "lightDiffuse",   //directional light diffuse color
		"lightSpecular"  : "lightSpecular",  //directional light specular color
		//object material (currently only for entities)
		"materialAmbient"   : "materialAmbient",
		"materialDiffuse"   : "materialDiffuse",
		"materialSpecular"  : "materialSpecular",
		"materialShininess" : "materialShininess",
		//particles
		"screenWidth"  : "screenWidth",
		"particleData" : "particleData",
		"particleSize" : "particleSize",
		//material
		"colorMap" : "colorMap"
	};
})();
