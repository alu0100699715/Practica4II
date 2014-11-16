//variables globales
threshold = 128;
DEBUG = true;
var video = document.createElement('video');
var total = "";
var recognizer = new webkitSpeechRecognition();
recognizer.lang = "es-ES";
recognizer.continuous = true;
var dae;
var renderer;
var scene;
var camera;
var m;
var videoScene;
var videoCam;
var tmp;
var r;
var up = false;

function CargarCam(){
  video.width = 640;
  video.height = 480;
  video.loop = true;
  video.volume = 0;
  video.autoplay = true;
  video.controls = true;

var getUserMedia = function(t, onsuccess, onerror) {
  if (navigator.getUserMedia) {
    return navigator.getUserMedia(t, onsuccess, onerror);
  } else if (navigator.webkitGetUserMedia) {
    return navigator.webkitGetUserMedia(t, onsuccess, onerror);
  } else if (navigator.mozGetUserMedia) {
    return navigator.mozGetUserMedia(t, onsuccess, onerror);
  } else if (navigator.msGetUserMedia) {
    return navigator.msGetUserMedia(t, onsuccess, onerror);
  } else {
    onerror(new Error("No getUserMedia implementation found."));
  }
};

var URL = window.URL || window.webkitURL;
var createObjectURL = URL.createObjectURL || webkitURL.createObjectURL;
if (!createObjectURL) {
  throw new Error("URL.createObjectURL not found.");
}

getUserMedia({'video': true},
  function(stream) {
    var url = createObjectURL(stream);
    video.src = url;
  },
  function(error) {
    alert("Couldn't access webcam.");
  }
);

  
};

    THREE.Matrix4.prototype.setFromArray = function(m) {
    return this.set(
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    );
  };


function copyMatrix(mat, cm) {
    cm[0] = mat.m00;
    cm[1] = -mat.m10;
    cm[2] = mat.m20;
    cm[3] = 0;
    cm[4] = mat.m01;
    cm[5] = -mat.m11;
    cm[6] = mat.m21;
    cm[7] = 0;
    cm[8] = -mat.m02;
    cm[9] = mat.m12;
    cm[10] = -mat.m22;
    cm[11] = 0;
    cm[12] = mat.m03;
    cm[13] = -mat.m13;
    cm[14] = mat.m23;
    cm[15] = 1;
  }

function CargarModelo(){
     // document.body.appendChild(video);

    var canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    // document.body.appendChild(canvas);

    var debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugCanvas';
    debugCanvas.width = 320;
    debugCanvas.height = 240;
    document.body.appendChild(debugCanvas);

    var videoCanvas = document.createElement('canvas');
    videoCanvas.width = video.width;
    videoCanvas.height = video.width*3/4;

    var ctx = canvas.getContext('2d');
    ctx.font = "24px URW Gothic L, Arial, Sans-serif";



    var raster = new NyARRgbRaster_Canvas2D(canvas);
    var param = new FLARParam(320,240);

    var resultMat = new NyARTransMatResult();

    var detector = new FLARMultiIdMarkerDetector(param, 120);
    detector.setContinueMode(true);


    tmp = new Float32Array(16);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(960, 720);

    var glCanvas = renderer.domElement;
    var s = glCanvas.style;
    document.body.appendChild(glCanvas);

    scene = new THREE.Scene();
    var light = new THREE.PointLight(0xffffff);
    light.position.set(400, 500, 100);
    scene.add(light);
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-400, -500, -100);
    scene.add(light);
    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, 0, 0);
    scene.add(light);

    // Create a camera and a marker root object for your Three.js scene.
    camera = new THREE.Camera();
    scene.add(camera);
    
    // Next we need to make the Three.js camera use the FLARParam matrix.
    param.copyCameraMatrix(tmp, 10, 10000);
    camera.projectionMatrix.setFromArray(tmp);

    var videoTex = new THREE.Texture(videoCanvas);

    // Create scene and quad for the video.
    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 0),
      new THREE.MeshBasicMaterial({map: videoTex})
    );
    plane.material.depthTest = false;
    plane.material.depthWrite = false;
    videoCam = new THREE.Camera();
    videoScene = new THREE.Scene();
    videoScene.add(plane);
    videoScene.add(videoCam);

    var times = [];
    var markers = {};
    var lastTime = 0;

    setInterval(function(){
      if (video.ended) video.play();
      if (video.paused) return;
      if (window.paused) return;
      if (video.currentTime == video.duration) {
        video.currentTime = 0;
      }
      if (video.currentTime == lastTime) return;
      lastTime = video.currentTime;
      videoCanvas.getContext('2d').drawImage(video,0,0);
      ctx.drawImage(videoCanvas, 0,0,320,240);
      var dt = new Date().getTime();

      canvas.changed = true;
      videoTex.needsUpdate = true;

      var t = new Date();
      var detected = detector.detectMarkerLite(raster, threshold);
      for (var idx = 0; idx<detected; idx++) {
        var id = detector.getIdMarkerData(idx);
        var currId;
        if (id.packetLength > 4) {
          currId = -1;
        }else{
          currId=0;
          for (var i = 0; i < id.packetLength; i++ ) {
            currId = (currId << 8) | id.getPacketData(i);
          }
        }
        if (!markers[currId]) {
          markers[currId] = {};
        }
        detector.getTransformMatrix(idx, resultMat);
        markers[currId].age = 0;
        markers[currId].transform = Object.asCopy(resultMat);
      }
      for (var i in markers) {
        r = markers[i];
        if (r.age > 1) {
          delete markers[i];
          scene.remove(r.model);
        }
        r.age++;
      }
      for (var i in markers) {
        m = markers[i];
        if (!m.model) {
          m.model = new THREE.Object3D();
	  var loader = new THREE.ColladaLoader();
	  loader.options.convertUpAxis = true;
	  loader.load( './modelo/monster.dae', function ( collada ) {
	      dae = collada.scene;
	      dae.scale.x = dae.scale.y = dae.scale.z = 0.08;
          dae.updateMatrix();

	  } );

          //cilindro.position.z = -50;
          //sphere.doubleSided = true;
          m.model.matrixAutoUpdate = false;
        if(!up){
                recognizer.start();
                up = true; 
            }
          m.model.add(dae);
          scene.add(m.model);
        }
        copyMatrix(m.transform, tmp);
        m.model.matrix.setFromArray(tmp);
        m.model.matrixWorldNeedsUpdate = true;
      }
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(videoScene, videoCam);
      renderer.render(scene, camera);
    }, 15);
    
    
    
};

    recognizer.onresult = function(event) {
        var mov = 50;
	   for (var i = event.resultIndex; i < event.results.length; ++i) {
	       if (event.results[i].isFinal) {
               total = event.results[i][0].transcript;
	       }
          
	   }
     
     
      
    console.log(total);
    
       
  /*// y lo que sigue es lo mismo que está dentro del for cuando reconoce el modelo por primera vez, un copy paste:
  m.model.matrixAutoUpdate = false;
  monster.translateX(mov); // monster es tu dae, mov es la cantidad que se mueve
  monster.updateMatrix();
  m.model.add(monster);
  scene.add(m.model);
  copyMatrix(m.transform, tmp);
  m.model.matrix.setFromArray(tmp);
  m.model.matrixWorldNeedsUpdate = true;
  renderer.clear();
  renderer.render(scene,camera);*/
   
     if(total == "derecha" || total == " derecha"){
         
          if (m.model){
            console.log("Elimino");
            scene.remove(m.model);
            renderer.render(scene,camera);
            m.model = new THREE.Object3D();
          }
         
          console.log("Entro en derecha");
          m.model.matrixAutoUpdate = false;
          dae.translateX(mov);
          dae.updateMatrix();
          m.model.add(dae);
          scene.add(m.model);
          copyMatrix(m.transform, tmp);
          m.model.matrix.setFromArray(tmp);
          m.model.matrixWorldNeedsUpdate = true;
          renderer.clear();
          renderer.render(scene,camera);
      }
        
      else if(total == "izquierda" || total == " izquierda"){
           if (m.model){
            console.log("Elimino");
            scene.remove(m.model);
            renderer.render(scene,camera);
            m.model = new THREE.Object3D();
          }
         
          console.log("Entro en izquierda");
          m.model.matrixAutoUpdate = false;
          dae.translateX(-mov);
          dae.updateMatrix();
          m.model.add(dae);
          scene.add(m.model);
          copyMatrix(m.transform, tmp);
          m.model.matrix.setFromArray(tmp);
          m.model.matrixWorldNeedsUpdate = true;
          renderer.clear();
          renderer.render(scene,camera);
      }
        
      else if(total == "arriba" || total == " arriba"){
          if (m.model){
            console.log("Elimino");
            scene.remove(m.model);
            renderer.render(scene,camera);
            m.model = new THREE.Object3D();
          }
         
          console.log("Entro en arriba");
          m.model.matrixAutoUpdate = false;
          dae.translateY(mov);
          dae.updateMatrix();
          m.model.add(dae);
          scene.add(m.model);
          copyMatrix(m.transform, tmp);
          m.model.matrix.setFromArray(tmp);
          m.model.matrixWorldNeedsUpdate = true;
          renderer.clear();
          renderer.render(scene,camera);
      }
    
      else if(total == "abajo" || total == " abajo"){
          if (m.model){
            console.log("Elimino");
            scene.remove(m.model);
            renderer.render(scene,camera);
            m.model = new THREE.Object3D();
          }
         
          console.log("Entro en abajo");
          m.model.matrixAutoUpdate = false;
          dae.translateY(-mov);
          dae.updateMatrix();
          m.model.add(dae);
          scene.add(m.model);
          copyMatrix(m.transform, tmp);
          m.model.matrix.setFromArray(tmp);
          m.model.matrixWorldNeedsUpdate = true;
          renderer.clear();
          renderer.render(scene,camera);
      }
      
     else{
         console.log("No reconoce comando");
     }
    };
     
  


CargarCam(); 
window.onload = CargarModelo();  