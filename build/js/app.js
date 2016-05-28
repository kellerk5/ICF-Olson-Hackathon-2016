Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';


// Public
var addSkittles,
    audioLoader,
    camera,
    clock,
    clouds,
    container,
    controls,
    effect,
    element,
    getQueryVariable,
    globe,
    gravity = 0.08,
    ground,
    initWorld,
    initObjectLoop,
    initRendering,
    loadWorld,
    objConstraint,
    particleTexture,
    pointCloud,
    pointCloudGeom = new THREE.Geometry({}),
    numParticles,
    render,
    renderer,
    roomSize = {
      height: 500,
      width: 500
    },
    scene,
    skittleGeometry,
    skittleTexture = [],
    soundObject = {},
    stats,
    textureBackground,
    textureClouds,
    textureFloor,
    textureForeground,
    textureSky,
    skittles = [],
    sounds = {
      shatter: ['shatter1', 'shatter2', 'shatter3', 'shatter4', 'shatter5']
    },
    isVRMode = window.navigator.userAgent.match(/android|iphone|ipod|ipad|iemobile/i) || getQueryVariable('vrMode') === 'true',
    isDevMode = getQueryVariable('devMode') === 'true';

objConstraint = isVRMode ? 65 : 200;
numParticles = isVRMode ? 1000 : 2500;

createjs.Sound.alternateExtensions = ['mp3'];
Object.keys(sounds).forEach(function (category) {
  sounds[category].forEach(function (sound) {
    createjs.Sound.registerSound('sounds/' + sound + '.mp3', sound);
  });
});


function playSound (id) {
  createjs.Sound.play(id);
}

function isInView (object) {
  var frustum = new THREE.Frustum();
  var cameraViewProjectionMatrix = new THREE.Matrix4();

  // every time the camera or objects change position (or every frame)

  camera.updateMatrixWorld(); // make sure the camera matrix is updated
  camera.matrixWorldInverse.getInverse( camera.matrixWorld );
  cameraViewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
  frustum.setFromMatrix( cameraViewProjectionMatrix );

  // frustum is now ready to check all the objects you need

  return frustum.intersectsObject( object );
}


var $shatterContainer = $('#shatter-container');
var shatterContainerDom = $shatterContainer[0];
var $shatter;
if (isVRMode) {
  $shatter = $('.shatter');
} else {
  $shatter = $('#shatter-1').addClass('full');
  $('#shatter-2').hide();
}

function shatter () {
  $shatter.css('transform', 'rotate(' + Math.floor(Math.random() * 360) + 'deg)');
  $shatterContainer.css('opacity', 1);
  setTimeout(function () {
    $shatterContainer.css('opacity', 0);
  }, 750);
  if (!isVRMode) {
    var tween = new TWEEN.Tween({opacity: 1})
      .to({opacity: 0}, 1000)
      .onUpdate(function () {
        requestAnimationFrame(function () {
          shatterContainerDom.style.opacity = this.opacity;
        }.bind(this));
      }).start();
  }
  playSound(sounds.shatter[Math.floor(Math.random() * sounds.shatter.length)]);
}

// URL Vaiable helper
function getQueryVariable (variable) {
  var query = window.location.search.substring(1),
      vars = query.split("&");

  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return(false);
}


// Define the renderer globally
renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});

// Define the VR effect Globally
effect = new THREE.StereoEffect( renderer );


loadWorld = function() {
  // Create a loader manager & keep track of all pre-loaded items
  var manager = new THREE.LoadingManager(),
      particleMatLoader = new THREE.TextureLoader( manager ),
      skittleGeoLoader = new THREE.JSONLoader( manager ),
      skittleMatLoader = new THREE.TextureLoader( manager ),
      textureFloorLoader = new THREE.TextureLoader( manager ),
      textureForegroundLoader = new THREE.TextureLoader( manager ),
      textureBackgroundLoader = new THREE.TextureLoader( manager ),
      textureCloudsLoader = new THREE.TextureLoader( manager ),
      textureSkyLoader = new THREE.TextureLoader( manager );

  if (!isVRMode) {
    manager.onProgress = function ( item, loaded, total ) {
      console.log( 'currently loading: ' + item + '\n' + Math.round((loaded / total)*100) + '% loaded' );
    };
  }

  // Pause initiating the scene/world until ALL loaders have completed
  manager.onLoad = function() {
    // Initiate the world
    initWorld();
  };

  // Load the skittle model
  skittleGeoLoader.load('js/model/skittle.json', function(geometry){
    skittleGeometry = geometry;
  });

  // Load the skittle material
  for (var i = 0; i < 5; i++) {
    skittleMatLoader.load('js/model/skittle-' + i + '.gif',function(texture){
      var st = texture;
      st.minFilter = THREE.LinearFilter;
      skittleTexture.push(st);
    });
  }

  //Load the skittle particle material
  particleMatLoader.load('texture/skittle.png', function(texture){
    particleTexture = texture;
    particleTexture.minFilter = THREE.LinearFilter;
  });

  // Load Floor Texture
  textureFloorLoader.load('texture/ground.png', function(texture){
    textureFloor = texture;
    textureFloor.wrapS = THREE.RepeatWrapping;
    textureFloor.wrapT = THREE.RepeatWrapping;
    textureFloor.repeat.set( 10, 10 );
  });

  // Load Foreground Texture
  textureForegroundLoader.load('texture/foreground.png', function(texture){
    textureForeground = texture;
    textureForeground.minFilter = THREE.LinearFilter;
  });

  // Load Background Texture
  textureBackgroundLoader.load('texture/background.png', function(texture){
    textureBackground = texture;
    textureBackground.minFilter = THREE.LinearFilter;
  });

  // Load Clouds Texture
  textureCloudsLoader.load('texture/clouds.png', function(texture){
    textureClouds = texture;
    textureClouds.minFilter = THREE.LinearFilter;
  });

  // Load sky texture
  textureSkyLoader.load('texture/sky.png', function(texture){
    textureSky = texture;
    textureSky.minFilter = THREE.LinearFilter;
  });
};


initWorld = function() {
  // Initiate  Animation Tweening
  TWEEN.start();


  // Create & Configure Scene
  scene = new Physijs.Scene({
    broadphase: 'sweepprune',
    fixedTimeStep: 1 / 120
  });
  scene.setGravity(new THREE.Vector3( 0, -90, 0 ));
  scene.addEventListener(
    'update',
    function() {
      scene.simulate( undefined, 5 );
    }
  );


  // Create & Configure Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, roomSize.width*2);
  camera.position.set(0, (-1 * roomSize.height / 2) + 25, 0);
  scene.add( camera );
  

  // Create & Configure Renderer
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMapAutoUpdate = true;
  renderer.shadowMapSoft = true;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  element = renderer.domElement;
  container = document.getElementById('webglviewer');
  container.appendChild(element);


  // Check for Developer Mode
  if (isVRMode) {
    // Add & Configure Camera Control Using Device Orientation Controls
    controls = new THREE.DeviceOrientationControls(camera, true);
    controls.connect();
    controls.update();

    element.addEventListener('click', function(){
      container.webkitRequestFullscreen();
    }, false);

    // Steroscopic Effect
    effect.setSize( window.innerWidth, window.innerHeight );
  } else {
    // Add & Configure Camera Control Using OrbitControls
    controls = new THREE.OrbitControls(camera, element);
    controls.target.set(
      camera.position.x + 0.15,
      camera.position.y,
      camera.position.z
    );
    controls.enablePan = false;
    controls.enableZoom = false;
  }

  // Create & Configure Spotlight
  var spotLight = new THREE.SpotLight( 0xFFFFFF, 1.25, 1000, 5 );
  spotLight.position.set( 0, 100, 0 );
  spotLight.target.position.set( 0, 0, 0 );
  scene.add( spotLight );


  // Create & Configure Hemispherelight
  hemiLight = new THREE.HemisphereLight( 0xffffff, 0x000000, 1 );
  hemiLight.position.set( 0, 10, 0 );
  scene.add( hemiLight );


  // performance monitor
  if (isDevMode) {
    stats = new Stats();
    $('body').append( stats.dom );
  }


  // Invisible Geometry for camera
  var cameraGeometry = new Physijs.BoxMesh(
    new THREE.BoxGeometry( 20, 10, 20 ),
    Physijs.createMaterial(
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
      }),
      0.4, // friction
      0.5  // restitution
    ),
    0      // mass
  );
  cameraGeometry.name = 'user';
  cameraGeometry.position.set(0, (-1 * roomSize.height / 2) + 25, 0);
  scene.add( cameraGeometry );
  cameraGeometry.addEventListener( 'collision', function( otherObj, linear_velocity, angular_velocity ) {
    if (otherObj.name === 'customObj') {
      if(isInView(otherObj)) {
        shatter();
      }
    }
  });


  // Create & Configure Ground
  var ground = new Physijs.PlaneMesh(
    new THREE.PlaneGeometry( roomSize.width, roomSize.height ),
    Physijs.createMaterial(
      new THREE.MeshBasicMaterial({
        map: textureFloor
      }),
      0.4, // friction
      0.5  // restitution
    ),
    0      // mass
  );

  ground.rotation.x = Math.PI / -2;
  ground.position.y = -(roomSize.height/2);
  ground.name = 'ground';
  scene.add(ground);


  // Create & Configure Background
  var background = new THREE.Mesh(
    new THREE. CylinderGeometry( roomSize.width*1.25, roomSize.width*1.25, roomSize.height, 40, 1, true ),
    new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textureBackground,
      transparent: true
    })
  );
  scene.add( background );


  // Create & Configure Clouds
  clouds = new THREE.Mesh(
    new THREE. CylinderGeometry( roomSize.width, roomSize.width, roomSize.height, 40, 1, true ),
    new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textureClouds,
      transparent: true
    })
  );
  scene.add( clouds );


  // Create & Configure Foreground
  var foreground = new THREE.Mesh(
    new THREE. CylinderGeometry( roomSize.width/2, roomSize.width/2, roomSize.height, 40, 1, true ),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: textureForeground,
      transparent: true
    })
  );
  scene.add( foreground );


  // Create & configure the containing sphere
  globe = new THREE.Mesh(
    new THREE.SphereGeometry(roomSize.width*1.75, 32, 16),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: textureSky
    })
  );
  globe.rotation.set(1.5,0,0);
  globe.position.set(0,( (-1*globe.geometry.boundingSphere.radius)*.5 ),0);
  scene.add(globe);


  // create particles
  initParticles(roomSize.width, roomSize.height);
  scene.add(pointCloud);


  // Start Rendering & Physics
  initRendering();


  // Start Interval to add objects to scene
  initObjectLoop();
};


function initParticles (w, h) {
  // Build point cloud vertices.
  pointCloudGeom.vertices = Array.apply(null, Array(numParticles)).map(function () {
    var particle = new THREE.Vector3(
      Math.random() * w - w / 2,
      Math.random() * h - 100,
      Math.random() * w - w / 2
    );

    particle.velocityY = 0.005 + Math.random() / 2;
    particle.velocityX = (Math.random() - 0.2) / 3;
    particle.velocityZ = (Math.random() - 0.2) / 3;
    particle.acceleration = 0;
    return particle;
  });

  pointCloudGeom.colors = pointCloudGeom.vertices.map(function (c, i) {
    var colors = [
      new THREE.Color(0x800080), // Purple
      new THREE.Color(0xFFA500), // Orange
      new THREE.Color(0xFF0000), // Red
      new THREE.Color(0xFFFF00), // Yellow
      new THREE.Color(0x008000)  // Green
    ];
    var len = colors.length;
    return colors[i % len];
  });

  var pointCloudMaterial = new THREE.PointsMaterial({
    size: 4,
    map: particleTexture,
    vertexColors: THREE.VertexColors,
    transparent: true,
    alphaTest: 0.5
  });

  pointCloud = new THREE.Points(pointCloudGeom, pointCloudMaterial);
}


function updateParticles () {
  pointCloud.geometry.vertices.forEach(function (v) {
    v.acceleration += gravity;
    v.y -= v.velocityY + v.acceleration;
    v.x -= v.velocityX;
    v.z -= v.velocityZ;
    if (v.y <= -1 * roomSize.height/2) {
      v.acceleration = 0;
      v.y = roomSize.height / 2 - 100;
    }
    if (v.x > roomSize.width / 2 || v.x < roomSize.width / 2 * -1) {
      v.x = Math.random() * roomSize.width - roomSize.width / 2;
    }
    if (v.z > roomSize.width / 2 || v.z < roomSize.width / 2 * -1) {
      v.z = Math.random() * roomSize.width - roomSize.width / 2;
    }
  });
  pointCloud.geometry.verticesNeedUpdate = true;
}


function renderWorld () {
  clock = new THREE.Clock();
  scene.simulate();
  if (isDevMode) stats.update();
  globe.rotation.z += .001;
  clouds.rotation.y += .001;
  updateParticles();
  requestAnimationFrame( render );
}


// Define the rendering method
if (!isVRMode) {
  render = function() {
    renderWorld();
    renderer.render( scene, camera );
  };
} else {
  render = function() {
    renderWorld();
    camera.updateProjectionMatrix();
    controls.update(clock.getDelta());
    effect.render( scene, camera );
  };
}


initRendering = function(){
  requestAnimationFrame( render );
  scene.simulate();
};



addSkittles = function() {
  var material = new THREE.MeshPhongMaterial({
    opacity: 0,
    transparent: true,
    shininess: 90,
    map: skittleTexture[Math.floor(Math.random() * skittleTexture.length)] // choose random image from supplied list
  })

  var customObj = new Physijs.ConvexMesh(
    skittleGeometry,
    Physijs.createMaterial(
      material,
      0.9, // Friction
      0.1  // Restitution
    ),
    0.9    // Mass
  );


  customObj.name = 'customObj';
  customObj.castShadow = true;
  customObj.receiveShadow = true;

  // Start from a random position within a given range
  customObj.position.set(
    Math.random() * (40 - -40) + -40,
    (-1 * roomSize.height / 2) + 500,
    Math.random() * (40 - -40) + -40
  );

  // Start from a random rotation
  customObj.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );

  scene.add(customObj);
  skittles.push(customObj);

  new TWEEN.Tween(customObj.material).to({opacity: 1}, 500).start();
};


initObjectLoop = function() {
  var loopCounter = 0;

  var repeater = setInterval(
    function() {
      requestAnimationFrame(
        function () {
          if (loopCounter >= objConstraint) {
            scene.remove(skittles.shift());
          }
          addSkittles();
          loopCounter++;
        }
      );
    },
    250
  );
};


$(document).ready(function(){
  loadWorld();

  $( window ).resize(function() {
    renderer.setSize( window.innerWidth, window.innerHeight );
    effect.setSize( window.innerWidth, window.innerHeight );
  });
});
