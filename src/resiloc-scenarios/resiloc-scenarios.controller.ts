import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { CreateResilocIndicatorsOfResilocProxyDto, CreateResilocScenarioDto } from './dto/create-resiloc-scenario.dto';
import { PaginationResilocScenariosDto } from './dto/read-resiloc-scenario.dto';
import { UpdateResilocScenarioDto, UpdateResilocScenarioIndicatorProxyDto } from './dto/update-resiloc-scenario.dto';
import { ResilocScenario } from './entities/resiloc-scenario.entity';
import { ResilocScenariosService } from './resiloc-scenarios.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('resiloc-scenarios')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('resiloc-scenarios')
export class ResilocScenariosController {
     constructor(
          private readonly resilocScenarioService: ResilocScenariosService,
          private readonly configService: ConfigService
     ) { }

     @ApiCreatedResponse({ description: '{ "message": "Resiloc scenario {name} created successfully" }' })
     @ApiOperation({
          summary: 'Create a resiloc scenario',
          description: 'For admin only'
     })
     @UserRoles(UserRole.Admin)
     @UsePipes(new ValidationPipe())
     @Post()
     async create(@Body() createResilocScenarioDto: CreateResilocScenarioDto) {
          const resilocScenario = await this.resilocScenarioService.create(createResilocScenarioDto).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               if (err.code == this.configService.get<number>('typeorm.unique_validator_error_code')) {
                    const re = new RegExp(this.configService.get('parser.inside_rounded_brackets'));
                    let errors = []
                    errors.push(`${err.detail.match(re)[1]}: ${this.configService.get('typeorm.unique_validator_error_tag')}`)
                    throw new HttpException({
                         statusCode: err.status,
                         message: this.configService.get<string>('typeorm.resiloc_indicator_unique_validator_error_message'),
                         fields: errors
                    }, err.status);
               } else {
                    throw new HttpException({
                         statusCode: err.status,
                         message: err.message
                    }, err.status);
               }
          });
          if (resilocScenario) {
               return {
                    message: `Resiloc scenario ${resilocScenario.name} created successfully`,
                    resilocScenarioId: resilocScenario._id
                };
          } else {
               throw new BadRequestException(`Resiloc scenario created failed`);
          }
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocScenariosDto })
     @ApiOperation({
          summary: 'Get all resiloc scenarios in the inventory',
          description: 'For admin only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @UserRoles(UserRole.Admin)
     @Get()
     async findAll(@Query() { page, limit }) {
          return this.resilocScenarioService.findAll(page, limit).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocScenariosDto })
     @ApiOperation({
          summary: 'Get all resiloc scenarios that are visible to communities (verified and not draft) in the inventory',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('visible')
     async getVisibleResilocScenarios(@Query() { page, limit }, @AuthUser() authUser: any) {
          return this.resilocScenarioService.getVisibleResilocScenarios(page, limit, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: ResilocScenario })
     @ApiOperation({
          summary: 'Get information of a resiloc scenario',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc scenario to be retrieved', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get(':id')
     async getResilocScenario(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.resilocScenarioService.getResilocScenario(id, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc scenario {name} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc scenario id {id} does not exist' })
     @ApiOperation({
          summary: 'Associate resiloc indicators to a resiloc scenario',
          description: 'For admin only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc scenario to be assigned its resiloc indicators', required: true })
     @ApiBody({ type: CreateResilocIndicatorsOfResilocProxyDto })
     @UserRoles(UserRole.Admin)
     @UsePipes(new ValidationPipe())
     @Put('resiloc-indicators/:id')
     async assignResilocIndicatorsForResilocScenario(@Param('id') id: string, @Body() createResilocIndicatorsOfResilocProxyDto: CreateResilocIndicatorsOfResilocProxyDto) {
          const resilocScenario = await this.resilocScenarioService.assignResilocIndicatorsForResilocScenario(id, createResilocIndicatorsOfResilocProxyDto).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (resilocScenario) {
               return { message: `Resiloc scenario ${resilocScenario.name} updated successfully` };
          } else {
               throw new BadRequestException(`Resiloc scenario ${id} updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc scenario {name} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc scenario id {id} does not exist' })
     @ApiOperation({
          summary: 'Update resiloc scenario information',
          description: 'For admin only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc scenario to be updated', required: true })
     @UserRoles(UserRole.Admin)
     @UsePipes(new ValidationPipe())
     @Put(':id')
     async update(@Param('id') id: string, @Body() updateResilocScenarioDto: UpdateResilocScenarioDto) {
          const resilocScenario = await this.resilocScenarioService.update(id, updateResilocScenarioDto).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               if (err.code == this.configService.get<number>('typeorm.unique_validator_error_code')) {
                    const re = new RegExp(this.configService.get('parser.inside_rounded_brackets'));
                    let errors = []
                    errors.push(`${err.detail.match(re)[1]}: ${this.configService.get('typeorm.unique_validator_error_tag')}`)
                    throw new HttpException({
                         statusCode: err.status,
                         message: this.configService.get<string>('typeorm.resiloc_proxy_unique_validator_error_message'),
                         fields: errors
                    }, err.status);
               } else {
                    throw new HttpException({
                         statusCode: err.status,
                         message: err.message
                    }, err.status);
               }
          });
          if (resilocScenario) {
               return { message: `Resiloc scenario ${resilocScenario.name} updated successfully` };
          } else {
               throw new BadRequestException(`Resiloc scenario ${id} updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Scenario associated values updated successfully" }' })
     @ApiNotFoundResponse({ description: 'This id {id} does not exist' })
     @ApiOperation({
          summary: 'Update scenario associated values',
          description: 'For admin only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a scenario-proxy associated entity to be updated', required: true })
     @UserRoles(UserRole.Admin)
     @UsePipes(new ValidationPipe())
     @Put('scenario-proxy/:id')
     async updateResilocScenarioIndicatorProxy(@Param('id') id: string, @Body() updateResilocScenarioIndicatorProxyDto: UpdateResilocScenarioIndicatorProxyDto) {
          const resilocScenarioIndicatorProxy = await this.resilocScenarioService.updateResilocScenarioIndicatorProxy(id, updateResilocScenarioIndicatorProxyDto).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (resilocScenarioIndicatorProxy) {
               return { message: `Scenario associated values updated successfully` };
          } else {
               throw new BadRequestException(`Scenario associated values updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc scenario {id} removed successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc scenario id {id} does not exist' })
     @ApiOperation({
          summary: 'Delete a resiloc scenario',
          description: 'For admin only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc scenario to be removed', required: true })
     @UserRoles(UserRole.Admin)
     @Delete(':id')
     async remove(@Param('id') id: string) {
          const res = await this.resilocScenarioService.remove(id).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (res && res.affected > 0) {
               return { message: `Resiloc scenario ${id} removed successfully` };
          } else {
               throw new BadRequestException(`Resiloc scenario ${id} removed failed`);
          }
     }
}
