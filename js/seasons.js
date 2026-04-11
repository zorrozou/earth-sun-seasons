(function() {
    var scene, camera, renderer, controls;
    var sun, earth, earthGroup, moon;
    var orbitRadius = 200;
    var moonOrbitRadius = 25;
    
    // 精确的模拟时间
    var simTime = Date.now();
    var lastRealTime = Date.now();
    var paused = false;
    
    // 视角模式
    var currentViewMode = 'sun';
    
    // 速率档位
    var currentSpeedIndex = 0;
    var speedLevels = [1, 60, 600, 3600, 21600, 86400, 604800, 2592000, 7776000, 31536000];
    var speedLabels = ['1秒=1秒', '1秒=1分', '1秒=10分', '1秒=1时', '1秒=6时', '1秒=1天', '1秒=1周', '1秒=1月', '1秒=1季', '1秒=1年'];
    
    // 24节气数据（角度从春分开始）
    var solarTerms = [
        { name: '春分', angle: 0, color: '#00FF00' },
        { name: '清明', angle: 15, color: '#90EE90' },
        { name: '谷雨', angle: 30, color: '#98FB98' },
        { name: '立夏', angle: 45, color: '#FFFF00' },
        { name: '小满', angle: 60, color: '#FFD700' },
        { name: '芒种', angle: 75, color: '#FFA500' },
        { name: '夏至', angle: 90, color: '#FF4500' },
        { name: '小暑', angle: 105, color: '#FF6347' },
        { name: '大暑', angle: 120, color: '#FF0000' },
        { name: '立秋', angle: 135, color: '#FF8C00' },
        { name: '处暑', angle: 150, color: '#FFA07A' },
        { name: '白露', angle: 165, color: '#F0E68C' },
        { name: '秋分', angle: 180, color: '#FFA500' },
        { name: '寒露', angle: 195, color: '#DAA520' },
        { name: '霜降', angle: 210, color: '#CD853F' },
        { name: '立冬', angle: 225, color: '#87CEEB' },
        { name: '小雪', angle: 240, color: '#ADD8E6' },
        { name: '大雪', angle: 255, color: '#B0E0E6' },
        { name: '冬至', angle: 270, color: '#00BFFF' },
        { name: '小寒', angle: 285, color: '#1E90FF' },
        { name: '大寒', angle: 300, color: '#4169E1' },
        { name: '立春', angle: 315, color: '#32CD32' },
        { name: '雨水', angle: 330, color: '#00FA9A' },
        { name: '惊蛰', angle: 345, color: '#7CFC00' }
    ];
    
    // 月相名称
    var moonPhaseNames = ['新月', '峨眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];

    // 格式化时间
    function formatDateTime(timestamp) {
        var d = new Date(timestamp);
        return {
            date: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
            time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
        };
    }

    // 计算地球轨道角度（从春分点开始）
    function calculateOrbitAngle(date) {
        // 春分点约在3月20日
        var year = new Date(date).getFullYear();
        var springEquinox = new Date(year, 2, 20, 0, 0, 0);  // 3月20日
        
        // 如果当前日期在春分之前，用上一年的春分
        if (new Date(date) < springEquinox) {
            year--;
            springEquinox = new Date(year, 2, 20, 0, 0, 0);
        }
        
        var daysSinceEquinox = (new Date(date) - springEquinox) / (1000 * 60 * 60 * 24);
        var angle = (daysSinceEquinox / 365.25) * 360;  // 一年转360度
        
        return angle * Math.PI / 180;
    }

    // 计算太阳直射纬度
    function calculateSunLatitude(orbitAngle) {
        // 轨道角度0° = 春分，直射赤道
        // 轨道角度90° = 夏至，直射北回归线23.5°
        // 轨道角度180° = 秋分，直射赤道
        // 轨道角度270° = 冬至，直射南回归线-23.5°
        return 23.5 * Math.sin(orbitAngle);
    }

    // 计算月相
    function calculateMoonPhase(date) {
        var newMoonRef = Date.UTC(2000, 0, 6, 18, 14, 0);
        var daysSinceNew = (date - newMoonRef) / (1000 * 60 * 60 * 24);
        var synodicMonth = 29.530588;
        return (daysSinceNew % synodicMonth) / synodicMonth;  // 0=新月, 0.5=满月
    }

    // 获取当前节气
    function getCurrentSolarTerm(orbitAngleDeg) {
        var angle = ((orbitAngleDeg % 360) + 360) % 360;
        for (var i = solarTerms.length - 1; i >= 0; i--) {
            if (angle >= solarTerms[i].angle) {
                return solarTerms[i].name;
            }
        }
        return solarTerms[0].name;
    }

    // 更新时间显示
    function updateTimeDisplay() {
        var formatted = formatDateTime(simTime);
        document.getElementById('sim-time').textContent = formatted.time;
        document.getElementById('sim-date').textContent = formatted.date;
    }

    // 更新信息面板
    function updateInfoPanel() {
        var orbitAngleRad = calculateOrbitAngle(simTime);
        var orbitAngleDeg = orbitAngleRad * 180 / Math.PI;
        var sunLatitude = calculateSunLatitude(orbitAngleRad);
        var moonPhase = calculateMoonPhase(simTime);
        var moonPhaseIdx = Math.floor(moonPhase * 8) % 8;
        
        document.getElementById('orbit-angle').textContent = orbitAngleDeg.toFixed(1) + '°';
        document.getElementById('sun-latitude').textContent = sunLatitude.toFixed(2) + '°';
        document.getElementById('solar-term').textContent = getCurrentSolarTerm(orbitAngleDeg);
        document.getElementById('moon-phase').textContent = moonPhaseNames[moonPhaseIdx];
    }

    function init() {
        // 场景
        scene = new THREE.Scene();
        
        // 相机
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.set(250, 150, 250);
        
        // 渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container').appendChild(renderer.domElement);
        
        // 控制器
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 50;
        controls.maxDistance = 800;
        
        // 光照
        var ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);
        
        var sunLight = new THREE.PointLight(0xFFFFFF, 2, 0);
        sunLight.position.set(0, 0, 0);
        scene.add(sunLight);
        
        // 创建天体
        createSun();
        createOrbit();
        createEarth();
        createMoon();
        createSolarTermLabels();
        
        // 初始化时间显示
        updateTimeDisplay();
        updateInfoPanel();
        
        // 设置控件
        setupControls();
        
        // 开始动画
        animate();
    }

    function createSun() {
        var sunGeometry = new THREE.SphereGeometry(8, 32, 32);
        var sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFDB813 });
        sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.userData = { clickable: true, type: 'sun' };
        scene.add(sun);
        
        // 太阳光晕
        var glowGeometry = new THREE.SphereGeometry(40, 32, 32);
        var glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFA500,
            transparent: true,
            opacity: 0.2
        });
        var glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sun.add(glow);
    }

    function createOrbit() {
        // 地球轨道（椭圆，偏心率0.0167）
        var e = 0.0167;
        var a = orbitRadius;
        var points = [];
        
        for (var i = 0; i <= 128; i++) {
            var theta = (i / 128) * Math.PI * 2;
            var r = a * (1 - e * e) / (1 + e * Math.cos(theta));
            points.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
        }
        
        var orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        var orbitMaterial = new THREE.LineBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.6 });
        var orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        
        // 黄道面网格
        var gridHelper = new THREE.GridHelper(orbitRadius * 3, 30, 0xFFD700, 0xFFD700);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.08;
        scene.add(gridHelper);
    }

    function createEarth() {
        earthGroup = new THREE.Group();
        // 地轴倾斜方向固定（指向北极星方向）
        // 使用一个倾斜组来保持地轴方向固定
        
        var earthGeometry = new THREE.SphereGeometry(15, 64, 64);
        var textureLoader = new THREE.TextureLoader();
        
        // 使用高清纹理
        var earthTexture = textureLoader.load('/solar-system/textures/planets/Earth-HD.jpg');
        
        var earthMaterial = new THREE.MeshPhongMaterial({
            map: earthTexture,
            shininess: 5
        });
        
        earth = new THREE.Mesh(earthGeometry, earthMaterial);
        earth.userData = { clickable: true, type: 'earth' };
        earthGroup.add(earth);
        
        // 自转轴 - 添加到earth上，随地球一起
        var axisLength = 40;
        var axisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength * 2, 8);
        var axisMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 0.6 });
        var axisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
        earth.add(axisMesh);
        
        // 北极标记
        var northPole = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00FF00 })
        );
        northPole.position.y = axisLength;
        axisMesh.add(northPole);
        
        // 南极标记
        var southPole = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xFF0000 })
        );
        southPole.position.y = -axisLength;
        axisMesh.add(southPole);
        
        // 北京标记
        var beijingTheta = 206 * Math.PI / 180;
        var beijingLat = 40 * Math.PI / 180;
        var beijingMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xFF0000 })
        );
        beijingMarker.position.set(
            15.1 * Math.cos(beijingLat) * Math.sin(beijingTheta),
            15.1 * Math.sin(beijingLat),
            15.1 * Math.cos(beijingLat) * Math.cos(beijingTheta)
        );
        earth.add(beijingMarker);
        
        // 赤道线
        var equatorPoints = [];
        for (var i = 0; i <= 64; i++) {
            var angle = (i / 64) * Math.PI * 2;
            equatorPoints.push(new THREE.Vector3(Math.cos(angle) * 15.1, 0, Math.sin(angle) * 15.1));
        }
        var equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        var equatorLine = new THREE.Line(equatorGeometry, new THREE.LineBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.5 }));
        earth.add(equatorLine);
        
        // 北回归线
        var tropicNorthPoints = [];
        var tropicLat = 23.5 * Math.PI / 180;
        for (var i = 0; i <= 64; i++) {
            var angle = (i / 64) * Math.PI * 2;
            var r = 15.1 * Math.cos(tropicLat);
            tropicNorthPoints.push(new THREE.Vector3(Math.cos(angle) * r, 15.1 * Math.sin(tropicLat), Math.sin(angle) * r));
        }
        var tropicNorthGeometry = new THREE.BufferGeometry().setFromPoints(tropicNorthPoints);
        var tropicNorthLine = new THREE.Line(tropicNorthGeometry, new THREE.LineBasicMaterial({ color: 0xFFA500, transparent: true, opacity: 0.4 }));
        earth.add(tropicNorthLine);
        
        // 南回归线
        var tropicSouthPoints = [];
        for (var i = 0; i <= 64; i++) {
            var angle = (i / 64) * Math.PI * 2;
            var r = 15.1 * Math.cos(tropicLat);
            tropicSouthPoints.push(new THREE.Vector3(Math.cos(angle) * r, -15.1 * Math.sin(tropicLat), Math.sin(angle) * r));
        }
        var tropicSouthGeometry = new THREE.BufferGeometry().setFromPoints(tropicSouthPoints);
        var tropicSouthLine = new THREE.Line(tropicSouthGeometry, new THREE.LineBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.4 }));
        earth.add(tropicSouthLine);
        
        scene.add(earthGroup);
        
        // 地轴倾斜：绕X轴旋转-23.5度
        // 四季演示中：夏至轨道角度=90°，地球在(0,0,r)，太阳在-Z方向
        // 地轴偏向-Z方向，使北极指向太阳
        earthGroup.rotation.x = -23.5 * Math.PI / 180;
        earthGroup.rotation.z = 0;
        
        // 初始化地球位置
        updateEarthPosition();
    }

    function createMoon() {
        var moonGeometry = new THREE.SphereGeometry(4, 32, 32);
        var textureLoader = new THREE.TextureLoader();
        var moonTexture = textureLoader.load('/solar-system/textures/planets/Moon.jpg');
        var moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture, shininess: 1 });
        moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.userData = { clickable: true, type: 'moon' };
        scene.add(moon);
        
        // 月球轨道线
        var moonOrbitPoints = [];
        for (var i = 0; i <= 64; i++) {
            var angle = (i / 64) * Math.PI * 2;
            moonOrbitPoints.push(new THREE.Vector3(Math.cos(angle) * moonOrbitRadius, 0, Math.sin(angle) * moonOrbitRadius));
        }
        var moonOrbitGeometry = new THREE.BufferGeometry().setFromPoints(moonOrbitPoints);
        var moonOrbitLine = new THREE.Line(moonOrbitGeometry, new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3 }));
        earthGroup.add(moonOrbitLine);
    }

    function createSolarTermLabels() {
        // 只显示主要节气（每3个显示一个）
        var mainTerms = [0, 6, 12, 18];  // 春分、夏至、秋分、冬至
        
        mainTerms.forEach(function(idx) {
            var term = solarTerms[idx];
            createLabel(term.name, term.angle, term.color);
        });
        
        // 添加更多节气标签
        for (var i = 0; i < solarTerms.length; i += 3) {
            if (mainTerms.indexOf(i) === -1) {
                var term = solarTerms[i];
                createLabel(term.name, term.angle, term.color);
            }
        }
    }

    function createLabel(name, angleDeg, color) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = color;
        context.font = 'Bold 32px Microsoft YaHei, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, 128, 32);
        
        var texture = new THREE.CanvasTexture(canvas);
        var material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        var sprite = new THREE.Sprite(material);
        
        var rad = angleDeg * Math.PI / 180;
        var x = Math.cos(rad) * (orbitRadius + 35);
        var z = Math.sin(rad) * (orbitRadius + 35);
        sprite.position.set(x, 8, z);
        sprite.scale.set(30, 10, 1);
        sprite.userData = { angle: angleDeg };
        
        scene.add(sprite);
    }

    function updateEarthPosition() {
        var orbitAngle = calculateOrbitAngle(simTime);
        
        // 椭圆轨道
        var e = 0.0167;
        var a = orbitRadius;
        var r = a * (1 - e * e) / (1 + e * Math.cos(orbitAngle));
        
        var x = Math.cos(orbitAngle) * r;
        var z = Math.sin(orbitAngle) * r;
        
        earthGroup.position.set(x, 0, z);
        
        // 地球自转（根据北京时间）
        var d = new Date(simTime);
        var beijingHour = (d.getUTCHours() + 8 + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600) % 24;
        var toSun = Math.atan2(-x, -z);
        var rotationFromNoon = (beijingHour - 12) * Math.PI / 12;
        var beijingTheta = 206 * Math.PI / 180;
        earth.rotation.y = toSun + rotationFromNoon - beijingTheta;
        
        // 月球位置（只有月球创建后才更新）
        if (moon) {
            var moonPhase = calculateMoonPhase(simTime);
            var sunLongitude = orbitAngle + Math.PI;
            var moonAngle = sunLongitude + moonPhase * 2 * Math.PI;
            
            var moonLocalX = Math.cos(moonAngle) * moonOrbitRadius;
            var moonLocalZ = Math.sin(moonAngle) * moonOrbitRadius;
            var moonWorldPos = new THREE.Vector3(moonLocalX, 0, moonLocalZ);
            moonWorldPos.applyMatrix4(earthGroup.matrixWorld);
            moon.position.copy(moonWorldPos);
        }
    }

    function setupControls() {
        // 速率滑块
        var speedSlider = document.getElementById('speed-slider');
        var speedValueEl = document.getElementById('speed-value');
        
        function updateSpeedDisplay() {
            if(speedValueEl) speedValueEl.textContent = speedLabels[currentSpeedIndex];
            if(speedSlider) speedSlider.value = currentSpeedIndex;
        }
        
        // 将函数暴露到全局作用域
        window.updateSpeedDisplay = updateSpeedDisplay;
        
        speedSlider.addEventListener('input', function() {
            currentSpeedIndex = parseInt(this.value);
            updateSpeedDisplay();
        });
        updateSpeedDisplay();
        
        // 暂停按钮
        var pb = document.getElementById('pause-btn');
        pb.addEventListener('click', function() {
            paused = !paused;
            pb.textContent = paused ? '▶ 继续' : '⏸ 暂停';
            lastRealTime = Date.now();
        });
        
        // 时间调整
        var adjustBtn = document.getElementById('adjust-btn');
        var timeAdjust = document.getElementById('time-adjust');
        
        adjustBtn.addEventListener('click', function() {
            timeAdjust.classList.toggle('show');
            if (timeAdjust.classList.contains('show')) {
                var d = new Date(simTime);
                document.getElementById('year-input').value = d.getFullYear();
                document.getElementById('month-input').value = d.getMonth() + 1;
                document.getElementById('day-input').value = d.getDate();
                document.getElementById('hour-input').value = d.getHours();
                document.getElementById('minute-input').value = d.getMinutes();
                document.getElementById('second-input').value = d.getSeconds();
            }
        });
        
        document.getElementById('apply-time').addEventListener('click', function() {
            var year = parseInt(document.getElementById('year-input').value);
            var month = parseInt(document.getElementById('month-input').value) - 1;
            var day = parseInt(document.getElementById('day-input').value);
            var hour = parseInt(document.getElementById('hour-input').value);
            var minute = parseInt(document.getElementById('minute-input').value);
            var second = parseInt(document.getElementById('second-input').value);
            
            simTime = new Date(year, month, day, hour, minute, second).getTime();
            lastRealTime = Date.now();
            updateEarthPosition();
            updateTimeDisplay();
            updateInfoPanel();
            timeAdjust.classList.remove('show');
        });
        
        // 重置按钮
        document.getElementById('reset-btn').addEventListener('click', function() {
            simTime = Date.now();
            lastRealTime = Date.now();
            updateEarthPosition();
            updateTimeDisplay();
            updateInfoPanel();
        });
        
        // 键盘控制
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                paused = !paused;
                pb.textContent = paused ? '▶ 继续' : '⏸ 暂停';
                lastRealTime = Date.now();
            }
            if (e.code === 'ArrowRight' || e.code === 'Equal') {
                currentSpeedIndex = Math.min(currentSpeedIndex + 1, speedLevels.length - 1);
                window.updateSpeedDisplay();
            }
            if (e.code === 'ArrowLeft' || e.code === 'Minus') {
                currentSpeedIndex = Math.max(currentSpeedIndex - 1, 0);
                window.updateSpeedDisplay();
            }
            if (e.code === 'KeyR') {
                simTime = Date.now();
                lastRealTime = Date.now();
                updateEarthPosition();
                updateTimeDisplay();
                updateInfoPanel();
            }
            if (e.code === 'Escape') {
                timeAdjust.classList.remove('show');
            }
        });
        
        // 响应式
        window.addEventListener('resize', function() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // 点击地球切换视角
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        
        renderer.domElement.addEventListener('click', function(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects([earth, sun], true);
            
            if (intersects.length > 0) {
                var obj = intersects[0].object;
                // 向上查找 userData
                while (obj && !obj.userData.clickable) {
                    obj = obj.parent;
                }
                
                if (obj && obj.userData.clickable) {
                    if (obj.userData.type === 'earth') {
                        setViewMode('earth');
                    } else if (obj === sun) {
                        setViewMode('sun');
                    }
                }
            }
        });
    }
    
    // 切换视角
    function setViewMode(mode) {
        currentViewMode = mode;
        
        if (mode === 'sun') {
            camera.position.set(250, 150, 250);
            controls.target.set(0, 0, 0);
            document.getElementById('view-mode').textContent = '太阳视角';
        } else if (mode === 'earth') {
            var earthWorldPos = earthGroup.position.clone();
            camera.position.copy(earthWorldPos).add(new THREE.Vector3(0, 50, 80));
            controls.target.copy(earthWorldPos);
            document.getElementById('view-mode').textContent = '地球视角';
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        
        // 计算真实时间流逝
        var realNow = Date.now();
        var realElapsed = realNow - lastRealTime;
        lastRealTime = realNow;
        
        // 更新模拟时间
        if (!paused) {
            simTime += realElapsed * speedLevels[currentSpeedIndex];
            updateTimeDisplay();
            updateInfoPanel();
            updateEarthPosition();
        }
        
        // 太阳脉动
        if (sun) {
            var scale = 1 + Math.sin(Date.now() * 0.001) * 0.02;
            sun.scale.setScalar(scale);
        }
        
        // 地球视角时相机跟随
        if (currentViewMode === 'earth' && earthGroup) {
            var earthWorldPos = earthGroup.position.clone();
            controls.target.copy(earthWorldPos);
        }
        
        controls.update();
        renderer.render(scene, camera);
    }

    init();
})();