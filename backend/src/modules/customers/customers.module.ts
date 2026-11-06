import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Ride } from '../rides/entities/ride.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Ride])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
