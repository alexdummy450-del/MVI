import { AccidentIntakeForm } from "@/components/intake/accident-intake-form";

export default function NewAccidentPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="id-tag text-forest-400">NEW CASE</p>
        <h1 className="mt-1 text-2xl font-semibold text-forest-800">Accident intake</h1>
        <p className="mt-1 text-sm text-forest-400">
          Capture the essentials at the scene. You can continue straight to inspection, or save a draft to finish later.
        </p>
      </div>
      <AccidentIntakeForm />
    </div>
  );
}
