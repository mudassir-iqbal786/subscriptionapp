<?php
use Illuminate\Support\Facades\Route;


Route::get("/",function (){
   return response()->json([
       "name"=>"Mudasser Iqbal",
       "Email" => "mudasser425@gmail.com"
   ]);
});
