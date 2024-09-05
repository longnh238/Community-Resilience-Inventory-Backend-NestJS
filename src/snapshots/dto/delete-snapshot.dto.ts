import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class DeleteStaticProxiesFromSnapshotDto {
  @ApiProperty({
    type: String,
    isArray: true
  }) @IsArray() @IsNotEmpty() readonly staticProxyIds: string[];
}






