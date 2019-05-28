var frequency = 250; 	//Hz
var gain = 250;	
var VREFH = 3.3 		//Voltage
var VREFL = 0			//Voltage
var bits = 10;
var file = 'senales.txt';

$(document).ready(function () {
	var signals =[];
	var signalsAux = [];
	var labels =[];	
	var umbral;
	var positionHighPoints=[];
	var highPoints=[];
	var time = [];		//Segundos
	var AHF;			//Frecuencia cardiaca promedio
			
	$.get(file, function(data) {			//Lee el archivo de texto
		signals=data.split("\n");			//Lo partimos con cada salto de linea
		signalsAux=data.split("\n");
		
		CreateLabel(signals,labels);		//Labels para el gráfico
		CreateSignalECG(signals,labels);	//Creamos el gráfico
		
		umbral = FindUmbral(signalsAux);
		FindNumberCycles(signals,umbral,positionHighPoints,highPoints);			
		AHF = FindAverageHeartFrequency(signals,(positionHighPoints.length-1));		//La cantidad de ciclos es igual a la cantidad de puntos altos menos 1
		FindHeartInstantaneousFrequency(signals,positionHighPoints,highPoints,time);
		HeartRateAverage(AHF,time);
    }, "text");    
});

function CreateSignalECG(signals,labels) {
	var ctx = document.getElementById('chart-senal-ecg');
	new Chart(ctx, {
	  type: 'line',
	  data: {
		labels: labels,
		datasets: [{ 
			data: signals,
			label: "Señales",
			borderColor: "#3e95cd",
			fill: false
		  }
		]
	  },
	  options: {
		title: {
		  display: true,
		  text: 'Señal ECG'
		},
		scales:{
			yAxes: [{
				ticks: {
					//beginAtZero: true
				}
			}],
            xAxes: [{
                display: false 
            }]
        },
		elements: {
			point:{
				radius: 0
			}
		}
	  }
	});
}


function CreateLabel(signals,labels) {
	for (var i = 0; i < signals.length; i++) {
	   labels.push(i);
	}	
}

function FindUmbral(signals){
	signals.sort((a,b)=>a-b);		//Ordenamos el array de menor a mayor ->  posición 0 es el menor y el último es el mayor	
	var min = Number(signals[0]);
	var max = Number(signals.slice(-1).pop());
	var umbral = (min + (max-min)*0.85);
	return umbral;
}


function FindNumberCycles(signals,umbral,positionHighPoints,highPoints){
	for (var i = 0; i < signals.length; i++) {
	   if(signals[i]>umbral && signals[i]>signals[i-1] && signals[i]> signals[i+1]){
			positionHighPoints.push(i);
			highPoints.push(signals[i]);
	   }
	}
	$('#lbl-cantidad-ciclos').html(positionHighPoints.length-1);
}



function FindAverageHeartFrequency(signals, cycles){
	var time = signals.length/frequency;			//Segundos
	var AHF = 60*cycles/time;	
	$('#lbl-frecuencia-cardiaca-promedio').html(AHF+ " bpm");
	return AHF;
}

function FindHeartInstantaneousFrequency(signals, positionHighPoints,highPoints,time){
	var NumberFrequencies = (positionHighPoints.length)-1;		//Cantidad de frecuencias instantáneas = número de ciclos	
	var instantFrecuencies=[];	
	for (var i = 0; i < NumberFrequencies; i++) {				//Hallando el tiempo de cada ciclo
		var aux = (positionHighPoints[i+1]- positionHighPoints[i])/frequency;	//Halla la cantidad de puntos y divide con la frecuencia para hallar el tiempo
		time.push(aux);
		instantFrecuencies.push(Math.trunc(60/aux));
	}
	
	for (var i = 0; i < instantFrecuencies.length; i++) {	
		var lowPoint = FindLowerPoint(signals, positionHighPoints[i], 50);			//Buscamos el punto R dentro de los 50 puntos siguientes
		var amplitudeQRS = FindQRSAmplitude(highPoints[i],lowPoint);
		$('#tbody-frecuencias-instantaneas').append(
			'<tr>  '+
			'	<td >'+ (i+1) +'</td> '+
			'	<td >'+ time[i] +'</td> '+
			'	<td >'+ instantFrecuencies[i] +'</td> '+
			'	<td >'+ HeartRate(instantFrecuencies[i],time[i-1],time[i]) +'</td> '+
			'	<td >'+ amplitudeQRS +'</td> '+
			'</tr>'		
		);
	}
			
	$('#tbody-frecuencias-instantaneas').append(								//Último ciclo incompleto pero se puede hallar el complejo QRS
			'<tr>  '+
			'	<td >'+ (instantFrecuencies.length+1) +'</td> '+
			'	<td ></td> '+
			'	<td ></td> '+
			'	<td ></td> '+
			'	<td >'+FindQRSAmplitude(highPoints[highPoints.length-1],FindLowerPoint(signals, positionHighPoints[positionHighPoints.length-1], 50))+' </td> '+
			'</tr>'		
		);
}



function HeartRate(bpm,previousTime,currentTime){
	
	if((Math.abs(previousTime-currentTime)*1000)>=40){		//Convertimos a milisegundos y verificamos que no haya arritmia
		return 'Arritmia'
	}else if(bpm <60){
		return 'Bradicardia'
	} else if (bpm > 100){
		return 'Taquicardia'
	} else {
		return 'Normal';
	}	
}

function HeartRateAverage(bpm,time){
	var status;
	var isDiagnosed = false;
	
	for (var i = 0; i < time.length; i++) {	
		if((Math.abs(time[i]-time[i+1])*1000)>=40){		//Convertimos a milisegundos y verificamos que no haya arritmia
			status = 'Arritmia'
			isDiagnosed=true;
		}
	}
	
	if(!isDiagnosed){
		if(bpm <60){
			status = 'Bradicardia'
		} else if (bpm > 100){
			status = 'Taquicardia'
		} else {
			status ='Normal';
		}
	}
		
	
	$('#lbl-ritmo-cardiaco').html(status);
}

function FindLowerPoint(signals, postionHigPoint, range){
	var lowPoint=signals[postionHigPoint];
	
	for (var i = postionHigPoint; i <= (postionHigPoint+range); i++) {	
		if(lowPoint>signals[i]){
			lowPoint=signals[i];
		}
	}
	return lowPoint;	
}



function FindQRSAmplitude(highPoint, lowPoint){
	var amplitudeADC = (highPoint-lowPoint)*(VREFH-VREFL)/(Math.pow(2,bits));  	//Voltios
	var amplitudeQRS = amplitudeADC/gain *1000;									// x1000 para convertirlo a mV (milivoltios)	
	return amplitudeQRS.toFixed(2);												//Redondeo a 2 decimales
}











