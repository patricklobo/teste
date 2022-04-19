import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }

  isDev(){
    try {
      return Number(window.location.search.split("?isDev=")[1]);
    } catch (error) {
      return false;
    }
  }
}
