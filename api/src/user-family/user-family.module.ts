import { Module } from '@nestjs/common';
import { UserFamilyService } from './user-family.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFamily } from './entities/user-family.entity';
import { User } from 'src/user/entities/user.entity';
import { Family } from 'src/family/entities/family.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFamily,User,Family]),
  ],
  providers: [UserFamilyService],
  exports: [UserFamilyService]
})
export class UserFamilyModule {}
