"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCrudModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_crud_service_1 = require("./user-crud.service");
const user_crud_controller_1 = require("./user-crud.controller");
const users_1 = require("../../typeorm/entities/users");
let UserCrudModule = class UserCrudModule {
};
exports.UserCrudModule = UserCrudModule;
exports.UserCrudModule = UserCrudModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([users_1.User]),
        ],
        controllers: [user_crud_controller_1.UserCrudController],
        providers: [user_crud_service_1.UserCrudService],
    })
], UserCrudModule);
//# sourceMappingURL=user-crud.module.js.map