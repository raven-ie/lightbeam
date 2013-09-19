window.onload = function() {

	//awesome fps counter
	/*
	var stats = new Stats();
	stats.setMode(0);
	document.body.appendChild(stats.domElement);
	*/
	
	//create renderer (and continue if he was created)
	var renderer = null;
	if((renderer = lightbeam.createRenderer("viewport"))) {
		
		//shaders (just copy/paste)
		var vertexShader = "varying float lifePercentage;" +
						   "void main() {" +
					       "	vec4 eyePos = modelViewMatrix * vec4(particleData.x, particleData.y, particleData.z, 1.0);" +
						   "	vec4 projCorner = projectionMatrix * vec4(0.5 * particleSize, 0.5 * particleSize, eyePos.z, eyePos.w);" +
						   "	gl_Position = projectionMatrix * eyePos;" +
						   "	gl_PointSize = screenWidth * projCorner.x / projCorner.w;" +
						   "	lifePercentage = particleData.w;" +
						   "}",
			fragmentShader = "varying float lifePercentage;" +
							 "void main() {" +
							 "	vec4 textureColor = texture2D(colorMap, gl_PointCoord);" +
							 "	if(textureColor.a < 0.25) discard;" +
							 "	gl_FragColor = vec4(textureColor.rgb, textureColor.a * lifePercentage);" +
							 "}";
		renderer.createShader("shader-particles", vertexShader, fragmentShader, lightbeam.shader.type.particles);
		vertexShader = "varying vec2 texcoord;" +
					   "varying vec3 position;" +
					   "varying vec3 transformedNormal;" +
					   "void main(void) {" +
					   "	gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPosition, 1.0);" +
					   "	texcoord = vertexTexcoord;" +
					   "	position = vec3(modelViewMatrix * vec4(vertexPosition, 1.0)).xyz;" +
					   "	transformedNormal = normalize(normalMatrix * vertexNormal);" +
					   "}",
		fragmentShader = "varying vec2 texcoord;" +
						 "varying vec3 position;" +
						 "varying vec3 transformedNormal;" +
						 "void main(void) {" +
						 "	float directionalLight = max(dot(transformedNormal, lightDirection), 0.0);" +
						 "	vec3 lightWeight = materialAmbient * lightAmbient + materialDiffuse * lightDiffuse * directionalLight;" +
						 "	vec3 negateVertex = normalize(-position.xyz);" +
						 "	vec3 reflection = reflect(-lightDirection, transformedNormal);" +
						 "	float specularWeight = pow(max(dot(reflection, negateVertex), 0.0), materialShininess);" +
						 "	lightWeight += materialSpecular * lightSpecular * specularWeight;" +
						 "	vec4 textureColor = texture2D(colorMap, vec2(texcoord.s, texcoord.t));" +
						 "	gl_FragColor = vec4(textureColor.rgb * lightWeight, textureColor.a);" +
						 "}";
		renderer.createShader("shader-complex", vertexShader, fragmentShader, lightbeam.shader.type.complex);
		
		//now create camera (yourCameraID, followedEntityID, isActive)
		var camera = renderer.createCameraThirdPerson("camera", null, true);
		camera.distance.back = 15.0;
		camera.distance.top = 3.0;
		
		var objects = []; //for checking ray intersections and collisions
		var request = new XMLHttpRequest();
		request.open("GET", "models/obj/sphere.obj", true);
		request.onreadystatechange = function() {
			if(request.readyState == 4) {
				var sphereModel = lightbeam.converter.obj(request.responseText, {
					"normals"   : true,
					"texcoords" : true,
					"textures"  : true,
					"texturesPath" : "models/cube/"
				});
				var A = renderer.createEntity("A", {
					"shader"   	  : "shader-complex",
					"model"    	  : "sphere",
					"modelSource" : sphereModel,
					"position" 	  : [-5.0, 0.0, -10.0]
				});
				objects.push(A);
			}
		};
		request.send();
		var B = renderer.createEntity("B", {
			"shader"   : "shader-complex",
			"model"    : "models/scene/scene.mesh",
			"position" : [5.0, 0.0, 0.0],
			"rotation" : [0.0, 1.0, 0.0]
		});
		objects.push(B);
		
		//simple emitter
		var circles = {
			"count"    : 10000,
			"size"     : 0.5,
			"shader"   : "shader-particles",
			"texture"  : "particles/circle.png",
			"onUpdate" : function() {
				
				var r = 25.0;
				
				for(var i in this.particles) {
					
					var particle = this.particles[i];
					
					if(particle.timeRemaining < 0.0) {
						
						particle.timeRemaining = Math.random() * 40.0 + 10.0;
						
						particle.timeAll = particle.timeRemaining;
						
						particle.position = [Math.random() * (r - (-r)) + (-r),
											 25.0,
											 Math.random() * (r - (-r)) + (-r)];
					
					}
					
					particle.position[1] -= 1.0 * renderer.time.delta;
					particle.timeRemaining -= renderer.time.delta;
					
				}
			}
		};
		renderer.createEmitter("emitter", circles);
		
		document.getElementById("viewport").onmousedown = function(event) {
			var w = this.width,
				h = this.height,
				mouseCoords = [];
			
			//get mouse x, y coords relative to canvas element
			if(event.offsetX !== undefined) {
				mouseCoords[0] =  (event.offsetX - w / 2) / (w / 2);
				mouseCoords[1] = -(event.offsetY - h / 2) / (h / 2);
			}
			else {
				var x = event.pageX - this.offsetLeft,
					y = event.pageY - this.offsetTop;
				mouseCoords[0] =  (x - w / 2) / (w / 2);
				mouseCoords[1] = -(y - h / 2) / (h / 2);
			}
			
			var intersection = lightbeam.collisions.ray(mouseCoords, renderer.matrix, objects);
			if(intersection) {
				
				//we have here an intersection
				if(intersection.model == "sphere") {
					intersection.model = "models/scene/scene.mesh";
				}
				
			}
			
		};
		
		renderer.frame(); //start framing
		
		renderer.onUpdate = function() { //called on every frame
			
			//stats.update(); //update fps counter
			
			if(lightbeam.collisions.collider(B, objects)) {
				//there is collision between B entity and any entity of objects array
			}
			
		};
	}
};
