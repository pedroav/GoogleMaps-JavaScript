// Modulo responsavel pela leitura do USB/Serial.
var serialport = require("serialport");

// porta USB correspondente ao GPS.
var port = new serialport("/dev/ttyUSB0", {
    baudrate: 9600,
    parser: serialport.parsers.readline("\n")
});

// Importar Firebase SDK
var firebase = require('firebase');
var admin = require("firebase-admin");
var serviceAccount = require("/home/pi/JavaScript/firebase.json");

// Inicializando Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://XXXXX.firebaseio.com/"
});

// Referencia: https://www.npmjs.com/package/socket.io
var fs = require('fs')
    , http = require('http')
    , socketio = require('socket.io');

var server = http.createServer(function (req, res) {
    console.log(req.url)
    var contentType = 'text/html'
    var file = '/index.html'
    if (req.url.endsWith('.js')) {
        contentType = 'text/javascript'
        file = req.url
    }
    res.writeHead(200, { 'Content-type': contentType });
    res.end(fs.readFileSync(__dirname + file));
}).listen(8080, function () {
    console.log('Listening at: http://localhost:8080');
});

var sockets = []
socketio.listen(server).on('connection', function (socket) {
    console.log('socket connected')
    sockets.push(socket)
    // trecho responsavel pelo recebimento de informações

    // socket.on('message', function (msg) {
    //     console.log('Message Received: ', msg);
    //     socket.broadcast.emit('message', msg);
    // });
});

// Referencia: https://www.npmjs.com/package/serialport
port.on("open", function () {
    port.on('data', function (data) {
        // Apenas para exibir no console 
        console.log(data)

        // Filtro para obter apenas o GPGLL
        // Referencia: http://www.tronico.fi/OH6NT/docs/NMEA0183.pdf
        if (data.includes('GPGLL')) {
            data = data.split(',')

            // Formula para converter NMEA em decimal
            // Latitude:    ( X[1-2] + ( X[3...N] / 60 ))
            // Longitude:   ( Y[1-3] + ( Y[4...N] / 60 ))

            X1 = data[1][0] + data[1][1]
            Y1 = data[1].substring(2) / 60
            TOTAL_LAT = (parseFloat(X1) * -1) + (parseFloat(Y1) * -1)

            X2 = data[3][0] + data[3][1] + data[3][2]
            Y2 = data[3].substring(3) / 60
            TOTAL_LNG = (parseFloat(X2) * -1) + (parseFloat(Y2) * -1)

            // Apenas para exibir no console 
            // console.log(TOTAL_LAT, TOTAL_LNG)

            // Escrevendo GPS no Firebase
            var db = admin.database();
            var ref = db.ref("/");
            var usersRef = ref.child("GPS");
            usersRef.update({
                // API do GMaps precisa desse formato !!!
                myLatLng: ({ lat: TOTAL_LAT, lng: TOTAL_LNG })
            });

            // Socket.io -- Retorno
            sockets.forEach(function (socket) {
                socket.emit('latlng', { lat: TOTAL_LAT, lng: TOTAL_LNG })
            })
        }
        // Filtro para obter apenas o GPGGA
        // Referencia: http://www.tronico.fi/OH6NT/docs/NMEA0183.pdf
        
        // if (data.includes('GPGGA')) {
          //  data = data.split(',')

            // Escrevendo hhmmss no Firebase
            //hhmmss = data[1];
            //var db = admin.database();
            //var ref = db.ref("/");
            //var usersRef = ref.child("GPS");
            //usersRef.update({
            //    hhmmss: (hhmmss)
            //});

            // Escrevendo quantidade de satelites no Firebase
            //qtdSat = data[7];
            //var db = admin.database();
            //var ref = db.ref("/");
            //var usersRef = ref.child("GPS");
            //usersRef.update({
            //    qtdSat: (qtdSat)
           // });
        //}

    });
});
