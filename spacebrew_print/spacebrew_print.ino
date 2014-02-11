/*
 empty setup function is a hack to get #define working right
 http://forum.arduino.cc/index.php?PHPSESSID=bselqr44el9dpvp1q1tc7tns93&topic=38052.msg281918#msg281918
*/
void setup();
//#define SERVO
#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include "Stream.h"
#include <SPI.h>
#include <Spacebrew.h>
#include <Ethernet.h>
#include <WebSocketClient.h>

#ifdef SERVO
#include <Servo.h>
int servo_Pin = 9;
Servo myServo;
int cutPos = 60;
int openPos = 10;
#endif

/**
 * Declare which pins to communicate to the printer over
 */
int printer_RX_Pin = 5; // green wire
int printer_TX_Pin = 6; // yellow wire
const int maxWidth = 384;
const int arrayWidth = 384/8;
uint8_t line[arrayWidth];
const int charsPerLine = 32;
const int maxLines = 3;
const int maxChars = charsPerLine*maxLines;
char str[maxChars];
int newlineTimeout = 5000;
boolean waitForNewline = false;
long newlineTime;
boolean printUpsidedown = false;

//for spacebrew
Spacebrew sb;
//uint8_t mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
uint8_t mac[] = { 0xD0, 0x0D, 0xBE, 0xEF, 0xFE, 0xEE };


/**
 * Initialize the thermal printer
 */
Adafruit_Thermal printer(printer_RX_Pin, printer_TX_Pin);

void setup(){
  printer.begin();
  //make the line array all white
  for(int i = 0; i < arrayWidth; i++){
    line[i] = 0x00;
  }
  if (printUpsidedown){
    printer.upsideDownOn();
  }
  setupSpacebrew();
  #ifdef SERVO
  myServo.attach(servo_Pin);
  myServo.write(openPos);
  #endif
}

void setupSpacebrew(){
  //connect to spacebrew library info
  sb.onOpen(onOpen);
  sb.onClose(onClose);
  sb.onError(onError);
  
  //connect to message callbacks
  sb.onBooleanMessage(onBooleanMessage);
  sb.onStringMessage(onStringMessage);
  sb.onRangeMessage(onRangeMessage);
  
  //register publishers and subscribers
  sb.addPublish("Ready", SB_BOOLEAN);
  sb.addSubscribe("Boolean", SB_BOOLEAN);
  sb.addSubscribe("Graph", SB_RANGE);
  sb.addSubscribe("Text", SB_STRING);
  
  //connect to the spacebrew server
  Ethernet.begin(mac);
  sb.connect("10.5.5.2", "Thermal Printer", "A thermal printer that can print various data from spacebrew");
}

void loop(){
  sb.monitor();
  if (waitForNewline){
    if (millis() > newlineTime){
      printer.feed(1);
      waitForNewline = false;
    }
  }
}

void sendReady(){
  sb.send("Ready", (boolean)true);
}

void onBooleanMessage(char *name, bool value){
  printer.println(value?"True":"False");
  printer.feed(1);
  waitForNewline = true;
  newlineTime = millis() + newlineTimeout;
}

void onStringMessage(char *name, char* message){
  printer.print(message);
  #ifdef SERVO
  printer.feed(5);
  delay(500);
  myServo.write(cutPos);
  delay(500);
  myServo.write(openPos);
  #else
  printer.feed(1);
  #endif
  sendReady();
}

void onRangeMessage(char *name, int value){
  //remap to fit on receipt paper
  value = map(value, 0, 1024, 0, maxWidth);
  //how thick we want the line
  byte lineWidth = 3;
  char offset[lineWidth];
  for(int i = -lineWidth/2, indx = 0; indx < lineWidth; i++, indx++){
    //create the one-pixel dot for this iteration
    uint8_t dot = (1 << (7 - ((value+i)%8)));
    //figure out which byte to place it in
    offset[indx] = (value+i)/8;
    //add it to the current bitmap
    line[offset[indx]] |= dot;
  }
  
  printer.printBitmap(maxWidth, 1, line, false);
  
  //clear the pixels we just set
  for(int indx = 0; indx < lineWidth; indx++){
    line[offset[indx]] = 0x00;
  }
  waitForNewline = false;
  
  sb.send("Ready", (bool)true);
}

void onOpen(){
  //we are connected!
}

void onClose(int code, char* message){
  //disconected :(
}

void onError(char* message){}
