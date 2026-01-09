import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DespachoWizard } from "@/features/despacho/DespachoWizard";

const Despacho = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="DESPACHO DE SERVICIOS" 
        description="Creación y asignación de viajes"
      />
      <DespachoWizard />
    </div>
  );
};

export default Despacho;
