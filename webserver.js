      //GPIO 
      var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
      var ranoButton = new Gpio(18, 'in',  'rising', {debounceTimeout: 10});
      var uspavankaButton = new Gpio(23, 'in', 'rising', {debounceTimeout: 10});

      //Sprav server a nacitaj do neho nasu stranku ktroa je v rovnakom priecinku pod nazvom index.html
      var http = require('http').createServer(handler);
      var io = require('socket.io')(http);
      http.listen(8080); //listen to port 8080
      console.log("STARTED");
      function handler (req, res) { //create server
        fs.readFile(__dirname + '/index.html', function(err, data) { //read file index.html in public folder
          if (err) {
            res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
            return res.end("404 Not Found");
          }
          res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
          res.write(data); //write data from index.html
          return res.end();
        });
      }
      
      //SUBORY PRACA S ARRAY/LIST
      var fs = require('fs');
      var List = require("collections/list");

      //HUDBA
      var Sound = require('aplay');
      var musicWake = new Sound(); 
      var musicSleep = new Sound();
      var interval;
      const sleepFolder = './sleep/';
      const wakeFolder = './wake/';
      var playListWake = new Array();
      var playListSleep = new Array();
      var wasRanoButtonPushed = false;//potrebujeme vediet ci sa len skoncila pesnicka alebo som ju vypol 

      nacitajPlayList();
      pridajOnClick();





  //komunikacia medzi node a indexom
  io.sockets.on('connection', function (socket) {// WebSocket Connection
   
      //prisla nam sprava z clienta s budikom    
      socket.on('setAlarm', function(msg){                
        wasRanoButtonPushed = false;//niekde to treba dookola nastavovat tak idealne tu

        //vlastne ten interval mozem kludne aj na minutu a usetrime resources ?!
        interval = setInterval(function() {
          var now = new Date;
          var hour = now.getHours();
          var minute = now.getMinutes();
          var currentTime = addZero(hour) + ":" + addZero(minute)
          console.log("Current " + currentTime + "Alarm " + msg);
            
            if (currentTime == msg) {
              socket.emit('budikHra');//davame vediet na clienta ze uz je budik aby povolil dalsie setovanie
              var song = playListWake[Math.floor(Math.random()*playListSleep.length)];//zober random songu z playlistu
              song = "./wake/"+song;
              musicWake.play(song);
              clearInterval(interval);
            }
        }, 2000);    
      });
      

      //prisla nam sprava z clienta na zrusenie nastavenia budika(nie vypnutie len zrusenie nastavenia)
      socket.on('endAlarm', function(){        
          deSetAlarm();  
      });     
  });


//ked skonci ranna pesnicka chceme dalsiu ale nie ked bolo stlacene tlacitko
musicWake.on('complete', function () {
  if(wasRanoButtonPushed != true){
      var song = playListWake[Math.floor(Math.random()*playListSleep.length)];
          song = "./wake/"+song;          
          musicWake.play(song);
  }
});

  function addZero(time) {
    return (time < 10) ? "0" + time : time;
  }

    //klikacky na fyzicke buttony
   function pridajOnClick(){

      //Pridame onclink na Buzzer Button
      ranoButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton
          if (err) { //if an error
            console.error('There was an error', err); //output error message to console
            return;
          }         
          wasRanoButtonPushed = true;//stlacil som tlacitko a teda nechcem aby hrala dalsia pesnicka
          turnOffAlarm(); 
      });


      //Pridame onclink na Uspavanka Button
      uspavankaButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton
          if (err) { //if an error
            console.error('There was an error', err); //output error message to console
            return;
          }         
          setUspavanku(); 
      });
    }


    /******
    na zaciatku kontrolujem ci tam nieco a je ked hej tak vymazem...tu to moc nema vyznam ale potom to chcem pouzit aj inde,
     v dalsej verzii pribudne file upload/delete a potom budem cez toto robit update
    *****/
    function nacitajPlayList(){

      if(playListWake.length != 0){
        playListWake.length = 0;
      }

      if(playListSleep.length != 0){
        playListSleep.length = 0;
      }
      //nacitam wake playlist
      fs.readdirSync(wakeFolder).forEach(file => {        
        playListWake.push(file); 
      });

      //nacitame sleep playlist
      fs.readdirSync(sleepFolder).forEach(file => {
         playListSleep.push(file); 
      });
    }




    function setUspavanku(){
      var song = playListSleep[Math.floor(Math.random()*playListSleep.length)];
      song = "./sleep/"+song;     
      musicSleep.play(song);

      setTimeout(function () {        
        musicSleep.pause(); // pauzni hudbu po 20minutach
      }, 1200000);
    }


  function deSetAlarm(){    
    clearInterval(interval);
  }   

  function turnOffAlarm(){
    musicWake.pause(); 
    wasRanoButtonPushed = true;
  }   



  //upratovanie
  process.on('SIGINT', function () { //on ctrl+c

        ranoButton.unexport(); // Unexport Button GPIO to free resources
        uspavankaButton.unexport(); // Unexport Button GPIO to free resources
        process.exit(); //exit completely
  });