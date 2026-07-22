import { LogService } from './log.service';
import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hcw-stream-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

@NgModule({
  declarations: [HugAngularLibComponent],
  imports: [
    LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG})
  ],
  providers:[LogService],
  exports: [HugAngularLibComponent]
})
export class HugAngularLibModule { }
