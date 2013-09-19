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
	lightbeam.converter = {
		//converting obj file (.obj) to lightbeam model format (.mesh)
		"obj" : function(source, options) {
			var index = 0,
				current = null,
				mesh = {},
				tempVertices = [],
				tempNormals = [],
				tempTexcoords = [],
				tempFaces = {},
				lines = source.split(/\r?\n/g);
			for(var i in lines) {
				var line = lines[i].split(" ");
				if(line[0] == "o") {
					if(current) {
						if(options.normals === false) {
							delete current.normals;
						}
						if(options.texcoords === false) {
							delete current.texcoords;
						}
					}
					index = 0;
					mesh[line[1]] = {
						"vertices"  : [],
						"normals"   : [],
						"texcoords" : [],
						"indices"   : []
					};
					current = mesh[line[1]];
				}
				else if(line[0] == "v") {
					tempVertices.push(parseFloat(line[1]));
					tempVertices.push(parseFloat(line[2]));
					tempVertices.push(parseFloat(line[3]));
				}
				else if(line[0] == "vn") {
					tempNormals.push(parseFloat(line[1]));
					tempNormals.push(parseFloat(line[2]));
					tempNormals.push(parseFloat(line[3]));
				}
				else if(line[0] == "vt") {
					tempTexcoords.push(parseFloat(line[1]));
					tempTexcoords.push(parseFloat(line[2]));
				}
				else if(line[0] == "usemtl" && options.textures) {
					current.textures = {
						"colorMap" : options.texturesPath + line[1]
					};
				}
				else if(line[0] == "f") {
					for(var i = 1; i < 4; ++i) {
						var splited = line[i].split("/");
						if(!(line[i] in tempFaces)) {
							var a = parseInt(splited[0]) - 1,
								b = parseInt(splited[1]) - 1,
								c = parseInt(splited[2]) - 1;
							current.vertices.push(tempVertices[a * 3]);
							current.vertices.push(tempVertices[a * 3 + 1]);
							current.vertices.push(tempVertices[a * 3 + 2]);
							current.normals.push(tempNormals[c * 3]);
							current.normals.push(tempNormals[c * 3 + 1]);
							current.normals.push(tempNormals[c * 3 + 2]);
							current.texcoords.push(tempTexcoords[b * 2]);
							current.texcoords.push(tempTexcoords[b * 2 + 1]);
							tempFaces[line[i]] = index++;
						}
						current.indices.push(tempFaces[line[i]]);
					}
				}
			}
			if(current) {
				if(options.normals === false) {
					delete current.normals;
				}
				if(options.texcoords === false) {
					delete current.texcoords;
				}
			}
			return mesh;
		}
	};
})();
