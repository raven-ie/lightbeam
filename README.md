lightbeam
=========

Lightbeam is Small and Fast WebGL library.

First step
----------

Download lightbeam .zip file.  
If you want to try an example, copy the directory lightbeam into directory example  
and open index.html inside your browser.  
Remember to run it onto server.

Starting the engine
------------------

First you have to call method `createRenderer(string canvasID)` of global engine object *lightbeam*  
where *canvasID* is value of attribute *id* of your `<canvas id="canvasID"></canvas>`

`var renderer = lightbeam.createRenderer("yourCanvasID");`

*createRenderer* return new renderer instance or null if creating process failed.

Now you can start rendering process :)

`renderer.frame();`

It will update and draw scene maximally 60 times per second.

If you want to call method before each update you can redefine function *onUpdate* of renderer instance.

`renderer.onUpdate = function() { alert("Im called on every update"); }`

First cube
----------

It's simple. Just use `createEntity(entityID, properties);` of renderer.

    var entity = renderer.createEntity("myOwnEntity", {
      "shader" : "myShader",
      "model"  : "models/cube/cube.mesh"
    });

But wait... What mean *shader* or *myShader*? What mean *model* or *models/cube/cube.mesh*?  
*myShader* is ID of shader object, don't worry, we will create that soon.  
*models/cube/cube.mesh* is path to model.  
Model = geometry + path to each texture (image placed onto geometry)

You can find example models inside directory *example*.

Ok... model isn't a problem but shaders are.  
Shader programs are another topic so we won't talk about them.  
At the moment you can just copy/paste shader object (`createShader("shader-complex", ...)`)  
from file *lightbeam.js* inside directory *example*.  

The last thing you need to do is create camera.  

`createCameraFirstPerson(cameraID, isActive)`

Camera determines where to look.

`var camera = renderer.createCameraFirstPerson("myCamera", true);`

Camera looks at (0,0,0) (default) in 3D space.  
Cube is on (0,0,0) too, so we can't see this cube...

We must move the camera to position (0,0,-10).

`camera.position = [0,0,-10];`

Now we can see our first cube :)
