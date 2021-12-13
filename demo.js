var sceneWidth;
var sceneHeight;
var camera;
var scene;
var renderer;
var dom;
var sun;
var ground;

//configurações padrões
var rollingGroundSphere;
var heroSphere;
var rollingSpeed = 0.007; //velocidade do jogo
var heroRollingSpeed;
var worldRadius = 26;
var heroRadius = 0.2;
var sphericalHelper;
var pathAngleValues;
var heroBaseY = 1.8;
var bounceValue = 0.1;
var gravity = 0.005;
var leftLane = -1;
var rightLane = 1;
var middleLane = 0;
var currentLane;
var clock;
var jumping;

var treeReleaseInterval = 0.5; //intervalo de objetos criados 
var lastTreeReleaseTime = 0;
var treesInPath;
var treesPool;
var particleGeometry;
var particleCount = 20;
var explosionPower = 1.06;
var particles;

//criada para saber a pontuação do jogo
var scoreText;
var score;
var vidas = 10;

//criado para saber o tempo de jogo
var hrIni = Date.now();


//verifica colisão
var hasCollided;

init();



function createaudio() {
    const listener = new THREE.AudioListener();
    var sound1 = new THREE.PositionalAudio(listener);
    sound1.load('songs.mp3');
    sound1.setRefDistance(30);
    sound1.autoplay = true;
    sound1.setLoop(true);
    camera.add(sound1);
    // Start sound
    setTimeout(function() {
        sound1.play();
    }, 2000);
    // Try to detect end #1
    sound1.onended = function() {
        console.log('sound1 ended #1');
        this.isPlaying = false;
    };
    // Try to detect end #1
    sound1.addEventListener('ended', function() {
        console.log('sound1 ended #2');
    });
}


function createAudioExplosao() {
    const listener = new THREE.AudioListener();
    var sound1 = new THREE.PositionalAudio(listener);
    sound1.load('explosao.mp3');
    sound1.setRefDistance(30);
    sound1.autoplay = true;
    sound1.setLoop(false);
    camera.add(sound1);
    // Start sound
    setTimeout(function() {
        sound1.play();
    }, 2000);
    // Try to detect end #1
    sound1.onended = function() {
        console.log('sound2 ended #1');
        this.isPlaying = false;
    };
    // Try to detect end #1
    sound1.addEventListener('ended', function() {
        console.log('sound2 ended #2');
    });
}

function init() {
    // inicia a criação do jogo
    createScene();

    //chamada do loop
    update();
}

function createScene() {
    hasCollided = false;
    score = 0;
    treesInPath = [];
    treesPool = [];
    clock = new THREE.Clock();
    clock.start();

    //velocidade que a bola de neve gira ***
    heroRollingSpeed = (rollingSpeed * worldRadius / heroRadius) / 5;
    sphericalHelper = new THREE.Spherical();
    pathAngleValues = [1.52, 1.57, 1.62];

    //captura o tamanho da tela
    sceneWidth = window.innerWidth - 5;
    sceneHeight = window.innerHeight - 5;

    //cria cenario 3D
    scene = new THREE.Scene();

    /*
    O fog é uma propriedade da cena 3D em Três . 
    É sempre um truque útil para simular a profundidade ou mostrar um horizonte. 
    A cor da névoa é importante para a ilusão funcionar corretamente e depende da cor da cena e da iluminação
    */
    scene.fog = new THREE.FogExp2(0xf0fff0, 0.10);
    //perspective camera
    camera = new THREE.PerspectiveCamera(60, sceneWidth / sceneHeight, 0.1, 1000);

    createaudio();


    //renderizador com fundo transparente
    renderer = new THREE.WebGLRenderer({ alpha: true });
    //cor do céu 87CEFA ***
    renderer.setClearColor(0xfffafa, 1);

    //habilitar sombra
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sceneWidth, sceneHeight);
    dom = document.getElementById('TutContainer');
    dom.appendChild(renderer.domElement);

    createTreesPool();
    addWorld();
    addHero();
    addLight();
    addExplosion();

    camera.position.z = 6.5;
    camera.position.y = 2.5;

    window.addEventListener('resize', onWindowResize, false); //resize callback

    document.onkeydown = handleKeyDown;


    /*
    caixa informativa lado esquerdo da tela
    ****PONTUAÇÃO****
	*/
    scoreText = document.createElement('div');
    scoreText.style.position = 'absolute';
    scoreText.style.width = 150 + 'px';
    scoreText.style.height = 100;
    scoreText.style.backgroundColor = "blue";
    scoreText.innerHTML = "Pontuação: <b>0</b>";
    scoreText.style.top = 30 + 'px';
    scoreText.style.right = 0 + 'px';
    document.body.appendChild(scoreText);

    /*
    caixa informativa lado esquerdo da tela
    ****VIDAS****
    */
    vidaText = document.createElement('div');
    vidaText.style.position = 'absolute';
    vidaText.style.width = 150 + 'px';
    vidaText.style.height = 100;
    vidaText.style.backgroundColor = "yellow";
    vidaText.innerHTML = "Vidas: <b>" + vidas + "</b>";
    vidaText.style.top = 5 + 'px';
    vidaText.style.right = 0 + 'px';
    document.body.appendChild(vidaText);

}


/*
	ao colidir com o objeto da arvore é acionado a explosão
*/
function addExplosion() {
    particleGeometry = new THREE.Geometry();
    for (var i = 0; i < particleCount; i++) {
        var vertex = new THREE.Vector3();
        particleGeometry.vertices.push(vertex);
    }
    var pMaterial = new THREE.ParticleBasicMaterial({
        color: 0xfffafa,
        size: 0.2
    });
    particles = new THREE.Points(particleGeometry, pMaterial);
    scene.add(particles);
    particles.visible = false;
}

/*
	criar piscina de árvores
*/
function createTreesPool() {
    var maxTreesInPool = 10;
    var newTree;
    for (var i = 0; i < maxTreesInPool; i++) {
        newTree = createTree();
        treesPool.push(newTree);
    }
}

/*
	eventos do teclado para mover a direta e a esquerda e pular
*/
function handleKeyDown(keyEvent) {
    if (jumping) return;
    var validMove = true;
    if (keyEvent.keyCode === 37) { //esquerda
        if (currentLane == middleLane) {
            currentLane = leftLane;
        } else if (currentLane == rightLane) {
            currentLane = middleLane;
        } else {
            validMove = false;
        }
    } else if (keyEvent.keyCode === 39) { //direita
        if (currentLane == middleLane) {
            currentLane = rightLane;
        } else if (currentLane == leftLane) {
            currentLane = middleLane;
        } else {
            validMove = false;
        }
    } else {
        if (keyEvent.keyCode === 38) { //pular
            bounceValue = 0.1;
            jumping = true;
        }
        validMove = false;
    }
    //heroSphere.position.x=currentLane;
    if (validMove) {
        jumping = true;
        bounceValue = 0.06;
    }
}

/*
	adiciona objeto bola que irá percorer a lamina do objeto
*/
function addHero() {
    //cor da bola e tipo de esfera ***
    var sphereGeometry = new THREE.DodecahedronGeometry(heroRadius, 1);
    var sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xe5f2f2, shading: THREE.FlatShading })
    jumping = false;
    heroSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    heroSphere.receiveShadow = true;
    heroSphere.castShadow = true;
    scene.add(heroSphere);
    heroSphere.position.y = heroBaseY;
    //distancia da bolta ***
    heroSphere.position.z = 4.8;
    currentLane = middleLane;
    heroSphere.position.x = currentLane;
}

/*
	cria a laminha(chão) infitina do jogo
*/
function addWorld() {
    var sides = 40;
    var tiers = 40;
    var sphereGeometry = new THREE.SphereGeometry(worldRadius, sides, tiers);
    // cor da lamina ***
    var sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xfffafa, shading: THREE.FlatShading })

    var vertexIndex;
    var vertexVector = new THREE.Vector3();
    var nextVertexVector = new THREE.Vector3();
    var firstVertexVector = new THREE.Vector3();
    var offset = new THREE.Vector3();
    var currentTier = 1;
    var lerpValue = 0.5;
    var heightValue;
    var maxHeight = 0.07;
    for (var j = 1; j < tiers - 2; j++) {
        currentTier = j;
        for (var i = 0; i < sides; i++) {
            vertexIndex = (currentTier * sides) + 1;
            vertexVector = sphereGeometry.vertices[i + vertexIndex].clone();
            if (j % 2 !== 0) {
                if (i == 0) {
                    firstVertexVector = vertexVector.clone();
                }
                nextVertexVector = sphereGeometry.vertices[i + vertexIndex + 1].clone();
                if (i == sides - 1) {
                    nextVertexVector = firstVertexVector;
                }
                lerpValue = (Math.random() * (0.75 - 0.25)) + 0.25;
                vertexVector.lerp(nextVertexVector, lerpValue);
            }
            heightValue = (Math.random() * maxHeight) - (maxHeight / 2);
            offset = vertexVector.clone().normalize().multiplyScalar(heightValue);
            sphereGeometry.vertices[i + vertexIndex] = (vertexVector.add(offset));
        }
    }
    rollingGroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    rollingGroundSphere.receiveShadow = true;
    rollingGroundSphere.castShadow = false;
    rollingGroundSphere.rotation.z = -Math.PI / 2;
    scene.add(rollingGroundSphere);
    rollingGroundSphere.position.y = -24;
    rollingGroundSphere.position.z = 2;
    addWorldTrees();
}


/*
	Configurar propriedades de sombra para a luz dos abjetos
*/
function addLight() {
    var hemisphereLight = new THREE.HemisphereLight(0xfffafa, 0x000000, .9)
    scene.add(hemisphereLight);

    //quanto menor o valor menor a luz sobre o objeto
    sun = new THREE.DirectionalLight(0xcdc1c5, 0.9);

    //posição do sol
    sun.position.set(12, 6, -7);
    sun.castShadow = true;
    scene.add(sun);

    //quanto menor o valor de width e heing menor a luz sobre o objeto
    sun.shadow.mapSize.width = 256;
    sun.shadow.mapSize.height = 256;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
}

/*
	função para sortear onde os objetos arvores serão adicionados
	chamada pela função update
*/
function addPathTree() {
    var options = [0, 1, 2];
    var lane = Math.floor(Math.random() * 3);
    addTree(true, lane);
    options.splice(lane, 1);
    if (Math.random() > 0.5) {
        lane = Math.floor(Math.random() * 2);
        addTree(true, options[lane]);
    }
}

/*
	Um conjunto de árvores é colocado fora da pista rolante para criar o mundo usando
*/
function addWorldTrees() {
    var numTrees = 36;
    var gap = 6.28 / 36;
    for (var i = 0; i < numTrees; i++) {
        addTree(false, i * gap, true);
        addTree(false, i * gap, false);
    }
}

/*
	adiciona objeto arvores na pista
*/
function addTree(inPath, row, isLeft) {
    var newTree;
    if (inPath) {
        if (treesPool.length == 0) return;
        newTree = treesPool.pop();
        newTree.visible = true;
        console.log("add tree");
        treesInPath.push(newTree);
        sphericalHelper.set(worldRadius - 0.3, pathAngleValues[row], -rollingGroundSphere.rotation.x + 4);
    } else {
        newTree = createTree();
        var forestAreaAngle = 0; //[1.52,1.57,1.62];
        if (isLeft) {
            forestAreaAngle = 1.68 + Math.random() * 0.1;
        } else {
            forestAreaAngle = 1.46 - Math.random() * 0.1;
        }
        sphericalHelper.set(worldRadius - 0.3, forestAreaAngle, row);
    }
    newTree.position.setFromSpherical(sphericalHelper);
    var rollingGroundVector = rollingGroundSphere.position.clone().normalize();
    var treeVector = newTree.position.clone().normalize();
    newTree.quaternion.setFromUnitVectors(treeVector, rollingGroundVector);
    newTree.rotation.x += (Math.random() * (2 * Math.PI / 10)) + -Math.PI / 10;

    rollingGroundSphere.add(newTree);
}


/*
	cria objeto arvore 
	código copiado da internet :)
*/
function createTree() {
    var sides = 8;
    var tiers = 6;
    var scalarMultiplier = (Math.random() * (0.25 - 0.1)) + 0.05;
    var midPointVector = new THREE.Vector3();
    var vertexVector = new THREE.Vector3();
    var treeGeometry = new THREE.ConeGeometry(0.5, 1, sides, tiers);
    var treeMaterial = new THREE.MeshStandardMaterial({ color: 0x33ff33, shading: THREE.FlatShading });
    var offset;
    midPointVector = treeGeometry.vertices[0].clone();
    var currentTier = 0;
    var vertexIndex;
    blowUpTree(treeGeometry.vertices, sides, 0, scalarMultiplier);
    tightenTree(treeGeometry.vertices, sides, 1);
    blowUpTree(treeGeometry.vertices, sides, 2, scalarMultiplier * 1.1, true);
    tightenTree(treeGeometry.vertices, sides, 3);
    blowUpTree(treeGeometry.vertices, sides, 4, scalarMultiplier * 1.2);
    tightenTree(treeGeometry.vertices, sides, 5);
    var treeTop = new THREE.Mesh(treeGeometry, treeMaterial);
    treeTop.castShadow = true;
    treeTop.receiveShadow = false;
    treeTop.position.y = 0.9;
    treeTop.rotation.y = (Math.random() * (Math.PI));
    var treeTrunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
    var trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x886633, shading: THREE.FlatShading });
    var treeTrunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
    treeTrunk.position.y = 0.25;
    var tree = new THREE.Object3D();
    tree.add(treeTrunk);
    tree.add(treeTop);
    return tree;
}

function blowUpTree(vertices, sides, currentTier, scalarMultiplier, odd) {
    var vertexIndex;
    var vertexVector = new THREE.Vector3();
    var midPointVector = vertices[0].clone();
    var offset;
    for (var i = 0; i < sides; i++) {
        vertexIndex = (currentTier * sides) + 1;
        vertexVector = vertices[i + vertexIndex].clone();
        midPointVector.y = vertexVector.y;
        offset = vertexVector.sub(midPointVector);
        if (odd) {
            if (i % 2 === 0) {
                offset.normalize().multiplyScalar(scalarMultiplier / 6);
                vertices[i + vertexIndex].add(offset);
            } else {
                offset.normalize().multiplyScalar(scalarMultiplier);
                vertices[i + vertexIndex].add(offset);
                vertices[i + vertexIndex].y = vertices[i + vertexIndex + sides].y + 0.05;
            }
        } else {
            if (i % 2 !== 0) {
                offset.normalize().multiplyScalar(scalarMultiplier / 6);
                vertices[i + vertexIndex].add(offset);
            } else {
                offset.normalize().multiplyScalar(scalarMultiplier);
                vertices[i + vertexIndex].add(offset);
                vertices[i + vertexIndex].y = vertices[i + vertexIndex + sides].y + 0.05;
            }
        }
    }
}

function tightenTree(vertices, sides, currentTier) {
    var vertexIndex;
    var vertexVector = new THREE.Vector3();
    var midPointVector = vertices[0].clone();
    var offset;
    for (var i = 0; i < sides; i++) {
        vertexIndex = (currentTier * sides) + 1;
        vertexVector = vertices[i + vertexIndex].clone();
        midPointVector.y = vertexVector.y;
        offset = vertexVector.sub(midPointVector);
        offset.normalize().multiplyScalar(0.06);
        vertices[i + vertexIndex].sub(offset);
    }
}

/*
	atualização da tela, cria objetos de colisão
*/
function update() {
    //stats.update();
    //animate
    rollingGroundSphere.rotation.x += rollingSpeed;
    heroSphere.rotation.x -= heroRollingSpeed;
    if (heroSphere.position.y <= heroBaseY) {
        jumping = false;
        bounceValue = (Math.random() * 0.04) + 0.005;
    }
    heroSphere.position.y += bounceValue;
    heroSphere.position.x = THREE.Math.lerp(heroSphere.position.x, currentLane, 2 * clock.getDelta()); //clock.getElapsedTime());
    bounceValue -= gravity;
    if (clock.getElapsedTime() > treeReleaseInterval) {
        clock.start();
        addPathTree();
        //verifica pontuação do jogo
        if (!hasCollided) {
            score += 2 * treeReleaseInterval;
            scoreText.innerHTML = "Pontuação: <b>" + score.toString() + "</b>";
        } else {
            hasCollided = false;
            score += 2 * treeReleaseInterval;
            vidas = vidas - 1;
            vidaText.innerHTML = "Vidas: <b>" + vidas.toString() + "</b>";
            createAudioExplosao();
        }
    }
    if (vidas == 0) {
        //alert('Fim de jogo! pontuação total: ' + score);
        gameOver();
    }
    doTreeLogic();
    doExplosionLogic();
    render();
    requestAnimationFrame(update); //request next update
}

function doTreeLogic() {
    var oneTree;
    var treePos = new THREE.Vector3();
    var treesToRemove = [];
    treesInPath.forEach(function(element, index) {
        oneTree = treesInPath[index];
        treePos.setFromMatrixPosition(oneTree.matrixWorld);
        if (treePos.z > 6 && oneTree.visible) { //gone out of our view zone
            //treesToRemove.push(oneTree);
        } else { //check collision
            if (treePos.distanceTo(heroSphere.position) <= 0.6) {
                console.log("hit");
                hasCollided = true;
                explode();
            }
        }
    });
    var fromWhere;
    treesToRemove.forEach(function(element, index) {
        oneTree = treesToRemove[index];
        fromWhere = treesInPath.indexOf(oneTree);
        treesInPath.splice(fromWhere, 1);
        treesPool.push(oneTree);
        oneTree.visible = false;
        console.log("remove tree");
    });
}

function doExplosionLogic() {
    if (!particles.visible) return;
    for (var i = 0; i < particleCount; i++) {
        particleGeometry.vertices[i].multiplyScalar(explosionPower);
    }
    if (explosionPower > 1.005) {
        explosionPower -= 0.001;
    } else {
        particles.visible = false;
    }
    particleGeometry.verticesNeedUpdate = true;
}

function explode() {
    particles.position.y = 2;
    particles.position.z = 4.8;
    particles.position.x = heroSphere.position.x;
    for (var i = 0; i < particleCount; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = -0.2 + Math.random() * 0.4;
        vertex.y = -0.2 + Math.random() * 0.4;
        vertex.z = -0.2 + Math.random() * 0.4;
        particleGeometry.vertices[i] = vertex;
    }
    explosionPower = 1.07;
    particles.visible = true;
}

function render() {
    renderer.render(scene, camera); //draw
}

function gameOver() {
    window.cancelAnimationFrame(render);
    render = undefined;
    mensagemFinal();
}

function onWindowResize() {
    //resize & align
    sceneHeight = window.innerHeight;
    sceneWidth = window.innerWidth;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();
}

function mensagemFinal() {
    $(document).ready(function() {
        $.ajax({
            type: 'GET',
            dataType: 'html',
            async: true,
            success: function(response) {
                var duracao = Date.now() - hrIni;
                $("#result").html('');
                $("#result").append("<h3>Fim de jogo</h3><p>Pontuação total: " + score + "</p>" + "<p>Tempo " + (duracao / 1000) + " segundos</p>");
                $('#exampleModal').modal('show');
            }
        });
        return false;
    });
}